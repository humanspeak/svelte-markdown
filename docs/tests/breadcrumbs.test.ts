import { expect, test, type Page } from '@playwright/test'
import { Parser } from 'htmlparser2'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const site = 'https://markdown.svelte.page'
const htmlPath = '/docs/renderers/html-renderers'
const advancedPath = '/docs/advanced/syntax-highlighting'
const comparePath = '/compare/vs-svelte-streamdown'

// Read literal navigation entries without executing imports of Svelte icons.
const navSource = ts.createSourceFile(
    'docsNav.ts',
    readFileSync(new URL('../src/lib/docsNav.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true
)
const docsPaths = new Set<string>()
function collectPaths(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(navSource) === 'href') {
        if (!ts.isStringLiteral(node.initializer)) {
            throw new Error('Navigation href must be a literal; update the route inventory reader')
        }
        if (node.initializer.text.startsWith('/docs/')) docsPaths.add(node.initializer.text)
    }
    ts.forEachChild(node, collectPaths)
}
function findSections(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(navSource) === 'docsSections') {
        if (!node.initializer) throw new Error('docsSections has no initializer')
        collectPaths(node.initializer)
    }
    ts.forEachChild(node, findSections)
}
findSections(navSource)
if (!docsPaths.has(htmlPath) || !docsPaths.has(advancedPath)) {
    throw new Error('Registered docs route inventory is missing the nested regression samples')
}

type JsonObject = Record<string, unknown>
function isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function breadcrumbLists(value: unknown): JsonObject[] {
    if (Array.isArray(value)) return value.flatMap(breadcrumbLists)
    if (!isObject(value)) return []
    const types = value['@type']
    const matches =
        types === 'BreadcrumbList' || (Array.isArray(types) && types.includes('BreadcrumbList'))
    return [...(matches ? [value] : []), ...Object.values(value).flatMap(breadcrumbLists)]
}

function parseScripts(scripts: string[]): JsonObject[] {
    return scripts.flatMap((script) => breadcrumbLists(JSON.parse(script)))
}

function ssrBreadcrumbs(html: string): JsonObject[] {
    const scripts: string[] = []
    let json = ''
    let inJson = false
    const parser = new Parser({
        onopentag(name, attributes) {
            if (name === 'script' && attributes.type === 'application/ld+json') {
                inJson = true
                json = ''
            }
        },
        ontext(text) {
            if (inJson) json += text
        },
        onclosetag(name) {
            if (name === 'script' && inJson) {
                scripts.push(json)
                inJson = false
            }
        }
    })
    parser.end(html)
    return parseScripts(scripts)
}

function assertBreadcrumbs(lists: JsonObject[], path: string, expectedNames?: string[]) {
    expect(lists, `${path}: BreadcrumbList count`).toHaveLength(path === '/' ? 0 : 1)
    if (path === '/') return
    const items = lists[0].itemListElement
    expect(Array.isArray(items), `${path}: itemListElement must be an array`).toBe(true)
    if (!Array.isArray(items)) throw new Error('Missing breadcrumb items')
    expect(items.length).toBeGreaterThanOrEqual(2)
    for (const [index, item] of items.entries()) {
        expect(isObject(item)).toBe(true)
        expect(item['@type']).toBe('ListItem')
        expect(item.position).toBe(index + 1)
        expect(typeof item.name).toBe('string')
        expect(item.name.trim().length).toBeGreaterThan(0)
        if (index === items.length - 1 && item.item === undefined) continue
        const href = isObject(item.item) ? item.item['@id'] : item.item
        expect(typeof href, `${path}: item ${index + 1} URL`).toBe('string')
        const url = new URL(href)
        expect(url.origin).toBe(site)
        expect(url.username).toBe('')
        expect(url.password).toBe('')
        expect(url.search).toBe('')
        expect(url.hash).toBe('')
        if (index < items.length - 1) {
            expect(['/', '/docs', '/examples', '/compare', '/blog', ...docsPaths]).toContain(
                url.pathname
            )
        }
    }
    expect(items[0].name).toBe('Home')
    if (expectedNames) expect(items.map((item) => item.name)).toEqual(expectedNames)
}

const samples = [
    ...new Set([
        ...docsPaths,
        '/docs',
        comparePath,
        '/examples/github-alerts',
        '/blog/rendering-markdown-in-svelte',
        '/'
    ])
]

for (const path of samples) {
    test(`SSR breadcrumbs: ${path}`, async ({ request, baseURL }) => {
        const response = await request.get(path, { maxRedirects: 0 })
        expect(response.status(), `${path}: unexpected response or redirect`).toBe(200)
        expect(response.url()).toBe(new URL(path, baseURL).href)
        expect(response.headers()['content-type']).toContain('text/html')
        assertBreadcrumbs(ssrBreadcrumbs(await response.text()), path)
    })
}

async function assertHydratedBreadcrumbs(page: Page, path: string, names?: string[]) {
    await expect(async () => {
        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
        assertBreadcrumbs(parseScripts(scripts), path, names)
    }).toPass()
}

test('hydration and client navigation preserve UI groups without stale schema', async ({
    page
}) => {
    const response = await page.goto(htmlPath)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(htmlPath)

    // An interactive state change establishes hydration before schema assertions.
    const darkButton = page.getByRole('button', { name: 'Dark', exact: true })
    await expect(async () => {
        await darkButton.click()
        await expect(darkButton).toHaveAttribute('aria-pressed', 'true')
    }).toPass()
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
    await expect(breadcrumb.getByText('Renderers', { exact: true })).toBeVisible()
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('HTML')
    await assertHydratedBreadcrumbs(page, htmlPath, ['Home', 'Docs', 'HTML'])

    // A full document load would discard this marker, even if the URL is correct.
    await page.evaluate(() =>
        document.documentElement.setAttribute('data-breadcrumb-spa', 'active')
    )
    async function navigate(path: string, names?: string[]) {
        await page.locator(`a[href="${path}"]:visible`).first().click()
        await expect(page).toHaveURL(path)
        await expect(page.locator('html')).toHaveAttribute('data-breadcrumb-spa', 'active')
        await assertHydratedBreadcrumbs(page, path, names)
    }

    await navigate(advancedPath, ['Home', 'Docs', 'Syntax Highlighting'])
    await expect(breadcrumb.getByText('Advanced', { exact: true })).toBeVisible()
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Syntax Highlighting')
    await navigate('/compare', ['Home', 'Compare'])
    await navigate(comparePath, ['Home', 'Compare', 'vs Svelte Streamdown'])
    await expect(breadcrumb).toContainText('Svelte Streamdown')
    await navigate('/')
    await expect(breadcrumb).toHaveCount(0)
})
