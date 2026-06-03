<script lang="ts">
    type DisplayFormat = 'decimal' | 'dms' | 'mission'
    type VisualMode = 'signal' | 'neon' | 'compact'

    type Props = {
        number1: number
        number2: number
        displayFormat: DisplayFormat
        visualMode: VisualMode
        raw?: string
    }

    const { number1, number2, displayFormat, visualMode, raw = '' }: Props = $props()

    const hemisphere = (value: number, positive: string, negative: string) =>
        value >= 0 ? positive : negative

    const toDms = (value: number) => {
        const absolute = Math.abs(value)
        const degrees = Math.floor(absolute)
        const minutesFloat = (absolute - degrees) * 60
        const minutes = Math.floor(minutesFloat)
        const seconds = ((minutesFloat - minutes) * 60).toFixed(1)

        return `${degrees}deg ${minutes}' ${seconds}"`
    }

    const decimalLabel = $derived(`${number1.toFixed(4)}, ${number2.toFixed(4)}`)
    const dmsLabel = $derived(
        `${toDms(number1)} ${hemisphere(number1, 'N', 'S')} / ${toDms(number2)} ${hemisphere(number2, 'E', 'W')}`
    )
    const missionLabel = $derived(
        `${Math.abs(number1 * 100).toFixed(0)}.${Math.abs(number2 * 100).toFixed(0)}`
    )
</script>

<span class="db-chip db-chip-{displayFormat} db-mode-{visualMode}" title={raw}>
    <span class="db-orbit" aria-hidden="true"></span>
    <span class="db-stack">
        <span class="db-kicker">
            {#if displayFormat === 'decimal'}
                decimal lock
            {:else if displayFormat === 'dms'}
                nav-grade dms
            {:else}
                mission tile
            {/if}
        </span>
        <span class="db-value">
            {#if displayFormat === 'decimal'}
                {decimalLabel}
            {:else if displayFormat === 'dms'}
                {dmsLabel}
            {:else}
                GRID-{missionLabel}
            {/if}
        </span>
    </span>
</span>

<style>
    .db-chip {
        --chip-accent: #15b8a6;
        --chip-ink: #08111f;
        --chip-bg: color-mix(in oklab, var(--chip-accent) 13%, white);
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        max-width: min(100%, 420px);
        margin: 0 3px;
        padding: 7px 10px 7px 8px;
        vertical-align: middle;
        border: 1px solid color-mix(in oklab, var(--chip-accent) 62%, black);
        background:
            linear-gradient(
                135deg,
                color-mix(in oklab, var(--chip-accent) 18%, white),
                transparent
            ),
            var(--chip-bg);
        color: var(--chip-ink);
        box-shadow: 4px 4px 0 color-mix(in oklab, var(--chip-accent) 42%, black);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        line-height: 1.1;
    }

    .db-chip-dms {
        --chip-accent: #e255a1;
    }

    .db-chip-mission {
        --chip-accent: #f0b429;
    }

    .db-mode-neon {
        background:
            linear-gradient(
                135deg,
                color-mix(in oklab, var(--chip-accent) 30%, white),
                transparent
            ),
            repeating-linear-gradient(
                -45deg,
                color-mix(in oklab, var(--chip-accent) 18%, transparent) 0 4px,
                transparent 4px 10px
            ),
            var(--chip-bg);
        box-shadow:
            4px 4px 0 color-mix(in oklab, var(--chip-accent) 42%, black),
            0 0 18px color-mix(in oklab, var(--chip-accent) 44%, transparent);
    }

    .db-mode-compact {
        gap: 6px;
        padding: 4px 7px 4px 5px;
        box-shadow: 2px 2px 0 color-mix(in oklab, var(--chip-accent) 42%, black);
    }

    :global(html.dark) .db-chip {
        --chip-ink: #f7fbff;
        --chip-bg: color-mix(in oklab, var(--chip-accent) 20%, #08111f);
        border-color: color-mix(in oklab, var(--chip-accent) 76%, white);
        box-shadow: 4px 4px 0 color-mix(in oklab, var(--chip-accent) 34%, black);
    }

    .db-orbit {
        position: relative;
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        border: 1px solid currentColor;
        border-radius: 999px;
    }

    .db-mode-compact .db-orbit {
        width: 16px;
        height: 16px;
    }

    .db-orbit::before,
    .db-orbit::after {
        content: '';
        position: absolute;
        inset: 5px;
        border: 1px solid currentColor;
        transform: rotate(45deg) scaleX(1.45);
    }

    .db-orbit::after {
        inset: 9px;
        border: 0;
        background: currentColor;
        transform: none;
    }

    .db-stack {
        display: inline-flex;
        min-width: 0;
        flex-direction: column;
        gap: 2px;
    }

    .db-kicker {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.72;
    }

    .db-value {
        overflow-wrap: anywhere;
        font-size: 12px;
        font-weight: 800;
    }

    .db-mode-compact .db-kicker {
        display: none;
    }

    .db-mode-compact .db-value {
        font-size: 11px;
    }
</style>
