<!--
@component
Renders a markdown image (`![alt](src "title")`) as an `<img>` element with
optional lazy loading and fade-in animation.

Uses `IntersectionObserver` to defer loading until the image scrolls near the
viewport (configurable via `lazy`).  On load the image fades in; on error it
is displayed with reduced opacity and a grayscale filter.

@prop {string} [href=''] - Image source URL.
@prop {string} [title] - Tooltip text for the image.
@prop {string} [text=''] - Alt text for accessibility.
@prop {boolean} [lazy=true] - Enable lazy loading via IntersectionObserver.
@prop {boolean} [fadeIn=true] - Enable a CSS fade-in transition on load.
-->
<script lang="ts">
    interface Props {
        href?: string
        title?: string
        text?: string
        lazy?: boolean // Enable lazy loading (default: true)
        fadeIn?: boolean // Enable fade-in effect (default: true)
    }

    const {
        href = undefined,
        title = undefined,
        text = '',
        lazy = true,
        fadeIn = true
    }: Props = $props()

    interface SourceAttempt {
        source: string | undefined
    }

    const source = $derived(href === '' ? undefined : href)
    const attempt = $derived<SourceAttempt>({ source })

    let img = $state<HTMLImageElement>()
    let loadedAttempt = $state.raw<SourceAttempt>()
    let errorAttempt = $state.raw<SourceAttempt>()
    let visible = $state(false)
    const exposed = $derived(visible || !lazy)
    const loaded = $derived(loadedAttempt === attempt)
    const error = $derived(errorAttempt === attempt)
    const nodeAttempts = new WeakMap<HTMLImageElement, SourceAttempt>()

    const tagAttempt = (node: HTMLImageElement, currentAttempt: SourceAttempt) => {
        nodeAttempts.set(node, currentAttempt)

        return {
            update(nextAttempt: SourceAttempt) {
                nodeAttempts.set(node, nextAttempt)
            },
            destroy() {
                nodeAttempts.delete(node)
            }
        }
    }

    $effect(() => {
        if (!lazy) visible = true
    })

    $effect(() => {
        const target = img
        if (exposed || !target) return

        // Environments without IntersectionObserver: show immediately
        if (typeof IntersectionObserver === 'undefined') {
            visible = true
            return
        }

        // Use IntersectionObserver for lazy loading
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    visible = true
                    observer.disconnect()
                }
            },
            {
                rootMargin: '50px' // Start loading 50px before visible
            }
        )

        observer.observe(target)

        return () => {
            observer.disconnect()
        }
    })

    const handleLoad = (event: Event) => {
        const currentAttempt = nodeAttempts.get(event.currentTarget as HTMLImageElement)
        if (!currentAttempt) return

        // Don't override error state if error already occurred
        if (errorAttempt === currentAttempt) return
        loadedAttempt = currentAttempt
    }

    const handleError = (event: Event) => {
        const currentAttempt = nodeAttempts.get(event.currentTarget as HTMLImageElement)
        if (!currentAttempt) return

        errorAttempt = currentAttempt
        loadedAttempt = currentAttempt
    }
</script>

{#snippet image(currentAttempt: SourceAttempt)}
    <img
        bind:this={img}
        use:tagAttempt={currentAttempt}
        src={exposed ? currentAttempt.source : undefined}
        data-src={href}
        {title}
        alt={text}
        loading={lazy ? 'lazy' : 'eager'}
        class:fade-in={fadeIn && loaded && !error}
        class:visible={!fadeIn && loaded && !error}
        class:error
        onload={handleLoad}
        onerror={handleError}
    />
{/snippet}

{#key attempt}
    {@render image(attempt)}
{/key}

<style>
    img {
        max-width: 100%;
        height: auto;
        opacity: 0;
    }

    img.fade-in {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
    }

    img.visible {
        opacity: 1;
        transition: none;
    }

    img.error {
        opacity: 0.5;
        filter: grayscale(100%);
    }
</style>
