<script lang="ts">
    import type { AlertType } from './markedAlert.js'

    interface Props {
        text: string
        alertType: AlertType
    }

    const { text, alertType }: Props = $props()

    const titles: Record<AlertType, string> = {
        note: 'Note',
        tip: 'Tip',
        important: 'Important',
        warning: 'Warning',
        caution: 'Caution'
    }
</script>

<div class="markdown-alert markdown-alert-{alertType}" role="note">
    <p class="markdown-alert-title">{titles[alertType]}</p>
    <p>{text}</p>
</div>
