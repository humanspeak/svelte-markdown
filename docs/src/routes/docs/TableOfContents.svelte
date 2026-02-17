<!--
  @component
  Right sidebar table of contents component (Svelte 5 + TypeScript)
  Auto-generated from page headings with smooth scroll and active section tracking

  @prop {TocHeading[]} headings - Array of heading objects with id, text, level, and element reference
-->
<script lang="ts">
    import { afterNavigate } from '$app/navigation'
    export type TocHeading = {
        id: string
        text: string
        level: number
        element: HTMLElement
    }

    const { headings = [] } = $props<{ headings: TocHeading[] }>()

    let activeHeading = $state<string>('')

    /**
     * Smoothly scrolls to a heading element by its ID
     * Accounts for header offset to ensure heading is at top of viewport
     */
    function scrollToHeading(id: string) {
        const element = document.getElementById(id)
        if (element) {
            // Optimistically set active for immediate feedback
            activeHeading = id

            // Calculate position accounting for any offset (headers, padding)
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.scrollY - 20 // 20px offset from top

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            })
        }
    }

    /**
     * Updates the active heading based on scroll position
     * Finds the topmost visible heading within 100px of viewport top
     */
    function updateActiveHeading() {
        // Reset if no headings
        if (headings.length === 0) {
            activeHeading = ''
            return
        }

        // Find the last heading that's above the threshold
        for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i]
            if (heading?.element) {
                const rect = heading.element.getBoundingClientRect()
                if (rect.top <= 100) {
                    activeHeading = heading.id
                    return
                }
            }
        }

        // Default to first heading if none are in view
        if (headings[0]?.id) {
            activeHeading = headings[0].id
        }
    }

    // Find the nearest scrollable container for the first heading
    function getScrollContainer(start: HTMLElement | undefined): HTMLElement | Window {
        if (!start) return window
        let node: HTMLElement | null = start.parentElement
        while (node && node !== document.body) {
            const style = getComputedStyle(node)
            const overflowY = style.overflowY
            if (
                (overflowY === 'auto' || overflowY === 'scroll') &&
                node.scrollHeight > node.clientHeight
            ) {
                return node
            }
            node = node.parentElement
        }
        return window
    }

    // React to heading changes (page navigation) and setup/cleanup scroll listener
    $effect(() => {
        // Reset and update when headings change
        activeHeading = ''
        updateActiveHeading()

        // Setup scroll listener on the correct scroll container
        const container = getScrollContainer(headings[0]?.element)
        const add = (target: HTMLElement | Window) =>
            target.addEventListener('scroll', updateActiveHeading)
        const remove = (target: HTMLElement | Window) =>
            target.removeEventListener('scroll', updateActiveHeading)
        add(container)
        // Also update on window resize (layout shifts)
        window.addEventListener('resize', updateActiveHeading)

        return () => {
            remove(container)
            window.removeEventListener('resize', updateActiveHeading)
        }
    })

    // Update when the route changes (client-side navigation)
    afterNavigate(() => {
        // Allow DOM to settle across frames, then recompute
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateActiveHeading()
            })
        })
    })
</script>

{#if headings.length > 0}
    <nav class="p-6">
        <h3 class="text-text-primary mb-4 text-sm font-semibold tracking-wide uppercase">
            On this page
        </h3>
        <ul class="space-y-2 text-sm">
            {#each headings as heading (heading.id)}
                <li style="margin-left: {(heading.level - 1) * 12}px">
                    <button
                        type="button"
                        onclick={() => scrollToHeading(heading.id)}
                        class="hover:text-accent block text-left transition-colors duration-150
						{activeHeading === heading.id ? 'text-accent font-medium' : 'text-text-secondary'}"
                    >
                        {heading.text}
                    </button>
                </li>
            {/each}
        </ul>
    </nav>
{/if}
