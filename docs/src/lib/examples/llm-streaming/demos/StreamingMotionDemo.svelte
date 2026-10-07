<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        FadeWords,
        RiseWords,
        FadeCharacters
    } from '@humanspeak/svelte-markdown/streaming/motion'
    import type { StreamingTextGranularity } from '@humanspeak/svelte-markdown'
    import MotionStreamingText from './MotionStreamingText.svelte'

    let effect = $state('fade-words')
    let duration = $state(0.18)
    let stagger = $state(0.02)
    let granularity = $state<StreamingTextGranularity>('word')
    let disabled = $state(false)
    // SSR and the first hydration render show baseline content without animation.
    let reducedMotion = $state(true)
    let source = $state('Existing content stays visible.\n\n')
    let streamId = $state(0)
    let running = $state(false)
    let timer: ReturnType<typeof setInterval> | undefined
    const enabled = $derived(!disabled && !reducedMotion)
    const Preset = $derived(
        effect === 'rise-words'
            ? RiseWords
            : effect === 'fade-characters'
              ? FadeCharacters
              : FadeWords
    )

    function stop() {
        clearInterval(timer)
        timer = undefined
        running = false
    }
    function restart() {
        stop()
        source = 'Existing content stays visible.\n\n'
        streamId++
    }
    function start() {
        restart()
        const chunks = [
            'New ',
            'words ',
            'can\u0027',
            't ',
            'replay ',
            '**old',
            '** ',
            'labels. ',
            '👩',
            '‍💻 ',
            'e',
            '\u0301',
            '\n\n',
            '`Code stays plain.`'
        ]
        let index = 0
        running = true
        timer = setInterval(() => {
            source += chunks[index++]
            if (index === chunks.length) stop()
        }, 100)
    }
    onMount(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => {
            reducedMotion = query.matches
        }
        update()
        query.addEventListener('change', update)
        return () => {
            query.removeEventListener('change', update)
            stop()
        }
    })
</script>

<div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
        <label
            >Effect
            <select bind:value={effect}>
                <option value="fade-words">Fade words</option>
                <option value="rise-words">Rise words</option>
                <option value="fade-characters">Fade characters</option>
                <option value="custom">Custom headless snippet</option>
            </select>
        </label>
        <label
            >Duration <input
                type="number"
                min="0"
                max="2"
                step="0.02"
                bind:value={duration}
            /></label
        >
        <label
            >Custom stagger <input
                type="number"
                min="0"
                max="0.1"
                step="0.01"
                bind:value={stagger}
            /></label
        >
        <label
            >Custom granularity
            <select bind:value={granularity}
                ><option value="word">Word</option><option value="grapheme">Grapheme</option
                ></select
            >
        </label>
        <label><input type="checkbox" bind:checked={disabled} /> Disable motion</label>
        <button onclick={start} disabled={running}>Stream sample</button>
        <button onclick={restart}>Restart stream</button>
    </div>
    <p>
        Motion is {enabled ? 'enabled' : 'disabled'}. System reduced motion: {reducedMotion
            ? 'on'
            : 'off'}. Stagger and granularity controls apply to the custom snippet; preset
        granularity is fixed.
    </p>
    <div data-testid="motion-output" class="rounded-lg border p-4">
        <SvelteMarkdown {source} {streamId} streaming streamingText>
            {#snippet rawtext({ text, streamingText })}
                {#if effect === 'custom'}
                    <MotionStreamingText
                        {text}
                        {streamingText}
                        {enabled}
                        {duration}
                        {stagger}
                        {granularity}
                    />
                {:else}
                    <Preset {text} {streamingText} {enabled} transition={{ duration }} />
                {/if}
            {/snippet}
        </SvelteMarkdown>
    </div>
</div>
