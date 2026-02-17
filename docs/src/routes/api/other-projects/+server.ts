import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

type OtherProject = {
    url: string
    slug: string
    shortDescription: string
}

export const GET: RequestHandler = async () => {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch('https://svelte.page/api/v1/others', {
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const projects = (await response.json()) as OtherProject[]

        // Validate response structure
        if (!Array.isArray(projects)) {
            throw new Error('Invalid response: expected array')
        }

        // Filter out this project (svelte-markdown)
        const otherProjects = projects.filter((project) => project.slug !== 'markdown')

        return json(otherProjects)
    } catch (error) {
        console.error('Failed to fetch other projects:', error)
        // Return empty array on error
        return json([])
    }
}
