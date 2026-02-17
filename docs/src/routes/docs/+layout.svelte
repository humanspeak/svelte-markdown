<script lang="ts">
    import { page } from '$app/state'
    import { afterNavigate } from '$app/navigation'
    import GithubSlugger from 'github-slugger'
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import Sidebar from './Sidebar.svelte'
    import TableOfContents from './TableOfContents.svelte'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    const { children } = $props()

    let contentElement: HTMLElement | undefined = $state(undefined)
    let headings: { id: string; text: string; level: number; element: HTMLElement }[] = $state([])

    // Create breadcrumb store and context
    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [{ title: 'Docs', href: '/docs' }, { title: 'Get Started' }]
        }
    })

    /**
     * Extract headings from content for table of contents
     * Generates descriptive, slugified IDs for better URL anchors using github-slugger
     */
    function extractHeadings() {
        if (!contentElement) return

        const headingElements = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
        const slugger = new GithubSlugger()

        headings = Array.from(headingElements).map((el, index) => {
            const text = el.textContent?.trim() || ''
            const level = parseInt(el.tagName.charAt(1))

            // Use existing ID if present, otherwise generate slug
            let id = el.id
            if (!id) {
                // Generate slug from text using github-slugger (handles uniqueness automatically)
                id = text ? slugger.slug(text) : `heading-${index}`
            }

            // Assign ID to the element if it doesn't have one
            if (!el.id) {
                el.id = id
            }

            return {
                id,
                text,
                level,
                element: el as HTMLElement
            }
        })
    }

    // Re-extract headings when navigating between pages
    afterNavigate(() => {
        // Single rAF for initial navigation tick
        requestAnimationFrame(() => {
            extractHeadings()
        })
    })

    // Setup MutationObserver to watch for DOM changes and initial extraction
    $effect(() => {
        if (!contentElement) return

        // Initial extraction
        extractHeadings()

        // Watch for DOM mutations (new content loaded via navigation)
        const observer = new MutationObserver(() => {
            extractHeadings()
        })

        observer.observe(contentElement, {
            childList: true,
            subtree: true
        })

        return () => {
            observer.disconnect()
        }
    })
</script>

<div class="bg-background flex min-h-screen flex-col justify-between">
    <Header />

    <div class="flex flex-1">
        <!-- Left sidebar - Navigation -->
        <aside
            class="border-sidebar-border bg-sidebar-background/95 hidden w-64 shrink-0 border-r shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto"
        >
            <Sidebar currentPath={page.url.pathname} />
        </aside>

        <!-- Main content area -->
        <main class="flex-1">
            <div class="flex">
                <!-- Content -->
                <article bind:this={contentElement} class="flex-1 px-4 py-8 sm:px-6 lg:px-8">
                    <div
                        class="prose text-text-primary prose-slate dark:prose-invert prose-headings:scroll-mt-20 max-w-none"
                    >
                        {@render children()}
                    </div>
                </article>

                <!-- Right sidebar - Table of Contents -->
                <aside
                    class="border-sidebar-border bg-sidebar-background/95 hidden w-56 shrink-0 border-l shadow-sm xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto"
                >
                    <TableOfContents {headings} />
                </aside>
            </div>
        </main>
    </div>
    <Footer />
</div>
