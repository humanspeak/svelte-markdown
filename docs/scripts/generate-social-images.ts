import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'

async function captureImage(url: string, outputPath: string) {
    const browser = await puppeteer.launch({
        headless: 'new'
    })
    const page = await browser.newPage()

    // Set viewport to match the OG component dimensions
    const dimensions = url.includes('type=twitter')
        ? { width: 1200, height: 600 }
        : { width: 1200, height: 630 }

    await page.setViewport(dimensions)

    // Wait for the dev server to be ready
    await page.goto(url, { waitUntil: 'networkidle0' })

    // Wait for our social card to be rendered
    await page.waitForSelector('#social-card')

    // Capture the specific element
    const element = await page.$('#social-card')
    if (!element) {
        throw new Error('Social card element not found')
    }

    await element.screenshot({
        path: outputPath,
        omitBackground: true
    })

    await browser.close()
}

async function main() {
    const baseUrl = 'http://localhost:5173/social-cards'
    const outputDir = path.join(process.cwd(), 'static')

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    try {
        console.log('Generating Twitter card...')
        await captureImage(
            `${baseUrl}?type=twitter`,
            path.join(outputDir, 'svelte-virtual-list-twitter.png')
        )

        console.log('Generating OpenGraph card...')
        await captureImage(
            `${baseUrl}?type=og`,
            path.join(outputDir, 'svelte-virtual-list-opengraph.png')
        )

        console.log('Social images generated successfully!')
    } catch (error) {
        console.error('Error generating social images:', error)
        process.exit(1)
    }
}

main()
