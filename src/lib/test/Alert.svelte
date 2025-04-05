<script lang="ts">
    interface Props {
        type: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark'
        level: string
        text: string
        raw: string
    }

    let { type, level, text, raw }: Props = $props()
    let style = $state('')

    switch (type) {
        case 'primary':
            style = 'border-color: #7dd3fc; background-color: #f0f9ff; color: #075985;'
            break
        case 'secondary':
            style = 'border-color: #cbd5e1; background-color: #f8fafc; color: #1e293b;'
            break
        case 'success':
            style = 'border-color: #86efad; background-color: #f0fdf4; color: #166534;'
            break
        case 'info':
            style = 'border-color: #67e8f9;  background-color: #ecfeff; color: #155f75;'
            break
        case 'warning':
            style = 'border-color: #fddf47; background-color: #fefce8; color: #713f12;'
            break
        case 'danger':
            style = 'border-color: #fca5a5; background-color: #fef2f2; color: #991b1b;'
            break
        case 'light':
            style = 'border-color: #e5e7eb; background-color: #fff; color: #1f2937;'
            break
        case 'dark':
            style = 'border-color: #94a3b8; background-color: #1e293b; color: #f8fafc;'
            break
        default:
            style = 'border-color: #7dd3fc; background-color: #f0f9ff; color: #075985;'
    }
</script>

<div
    style="{style} border-radius: 6px; padding: 8px 12px; margin: 16px 0; border-width: 1px; border-style: solid;"
>
    {text}
</div>
