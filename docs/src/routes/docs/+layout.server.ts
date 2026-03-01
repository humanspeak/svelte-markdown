import type { LayoutServerLoad } from './$types'

type OtherProject = {
    url: string
    slug: string
    shortDescription: string
}

export const load: LayoutServerLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/api/other-projects')
        if (!response.ok) return { otherProjects: [] }
        const projects: OtherProject[] = await response.json()
        return {
            otherProjects: projects.map((project) => ({
                title: project.slug.toLowerCase(),
                href: project.url,
                icon: 'heart' as const,
                external: true
            }))
        }
    } catch {
        return {
            otherProjects: [] as { title: string; href: string; icon: 'heart'; external: boolean }[]
        }
    }
}
