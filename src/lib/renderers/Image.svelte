<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        href?: string
        title?: string
        text?: string
        lazy?: boolean // Enable lazy loading (default: true)
        fadeIn?: boolean // Enable fade-in effect (default: true)
    }

    const { href = '', title = undefined, text = '', lazy = true, fadeIn = true }: Props = $props()

    let img: HTMLImageElement
    let loaded = $state(false)
    let visible = $state(!lazy) // If not lazy, visible immediately
    let error = $state(false)

    onMount(() => {
        if (!lazy) {
            // Not lazy loading - show immediately
            return
        }

        // Use IntersectionObserver for lazy loading
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    visible = true
                    observer.disconnect()
                }
            },
            {
                rootMargin: '50px' // Start loading 50px before visible
            }
        )

        if (img) {
            observer.observe(img)
        }

        return () => observer.disconnect()
    })

    const handleLoad = () => {
        loaded = true
    }

    const handleError = () => {
        error = true
        loaded = true
    }
</script>

<img
    bind:this={img}
    src={visible ? href : undefined}
    data-src={href}
    {title}
    alt={text}
    loading={lazy ? 'lazy' : 'eager'}
    class:fade-in={fadeIn && loaded && !error}
    class:error
    onload={handleLoad}
    onerror={handleError}
/>

<style>
    img {
        max-width: 100%;
        height: auto;
    }

    img:not(.fade-in):not(.error) {
        opacity: 0;
    }

    img.fade-in {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
    }

    img.error {
        opacity: 0.5;
        filter: grayscale(100%);
    }
</style>
