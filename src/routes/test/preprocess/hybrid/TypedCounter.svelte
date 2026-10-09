<script lang="ts">
    const {
        start,
        details,
        onchange
    }: {
        start: number
        details: { label: string }
        onchange: () => void
    } = $props()
    let clicks = $state(0)
</script>

<button
    data-testid="typed-counter"
    data-start-type={typeof start}
    data-details-type={typeof details}
    onclick={() => {
        clicks++
        onchange()
    }}>Count: {start + clicks} / {details.label}</button
>
