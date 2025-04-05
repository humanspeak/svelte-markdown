<script lang="ts">
    interface Props {
        type: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark'
        level: string
        text: string
        raw: string
    }

    // trunk-ignore(eslint/@typescript-eslint/no-unused-vars)
    // trunk-ignore(eslint/no-unused-vars)
    const { type, level, text, raw }: Props = $props()

    const displayLevel = $derived(level?.toLowerCase())

    const style = $derived.by(() => {
        switch (displayLevel) {
            case 'primary':
                return 'border-color: #7dd3fc; background-color: #f0f9ff; color: #075985;'

            case 'secondary':
                return 'border-color: #cbd5e1; background-color: #f8fafc; color: #1e293b;'

            case 'success':
                return 'border-color: #86efad; background-color: #f0fdf4; color: #166534;'

            case 'info':
                return 'border-color: #67e8f9;  background-color: #ecfeff; color: #155f75;'

            case 'warning':
                return 'border-color: #fddf47; background-color: #fefce8; color: #713f12;'

            case 'danger':
                return 'border-color: #fca5a5; background-color: #fef2f2; color: #991b1b;'

            case 'light':
                return 'border-color: #e5e7eb; background-color: #fff; color: #1f2937;'

            case 'dark':
                return 'border-color: #94a3b8; background-color: #1e293b; color: #f8fafc;'

            default:
                return 'border-color: #7dd3fc; background-color: #f0f9ff; color: #075985;'
        }
    })
</script>

<div
    style="{style} border-radius: 6px; padding: 8px 12px; margin: 16px 0; border-width: 1px; border-style: solid;"
    data-markdown-test="data-markdown-test-alert"
    data-markdown-test-level={displayLevel}
>
    {text}
</div>
