<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const vectors = [
        {
            name: 'javascript: protocol (basic)',
            source: '[Click me](javascript:alert("XSS-basic"))'
        },
        {
            name: 'javascript: protocol (mixed case)',
            source: '[Click me](JaVaScRiPt:alert("XSS-mixed-case"))'
        },
        {
            name: 'javascript: protocol (encoded)',
            source: '[Click me](javascript&#58;alert("XSS-encoded"))'
        },
        {
            name: 'data: URI',
            source: '[Click me](data:text/html,' + '<script>alert("XSS-data")<' + '/script>)'
        },
        {
            name: 'vbscript: protocol',
            source: '[Click me](vbscript:alert("XSS-vbscript"))'
        },
        {
            name: 'Image with onerror (raw HTML)',
            source: '<img src="x" onerror="alert(\'XSS-img\')" />'
        },
        {
            name: 'Link with onclick (raw HTML)',
            source: '<a href="#" onclick="alert(\'XSS-onclick\')">Click me</a>'
        },
        {
            name: 'Autolink with javascript:',
            source: '<javascript:alert("XSS-autolink")>'
        },
        {
            name: 'Image src with javascript:',
            source: '![alt](javascript:alert("XSS-img-src"))'
        },
        {
            name: 'Nested markdown link',
            source: '[**bold link**](javascript:alert("XSS-nested"))'
        }
    ]
</script>

<div class="security-demo">
    <h1>Security: XSS Vector Demo</h1>
    <p class="subtitle">
        Demonstrates Markdown-native XSS vectors that bypass input-level HTML sanitizers like
        DOMPurify. Each card shows the raw markdown source and renders it live.
    </p>
    <p class="warning">
        If clicking a rendered link triggers an alert dialog, that vector is exploitable.
    </p>

    <div class="vectors">
        {#each vectors as vector, i (vector.name)}
            <div class="vector-card">
                <div class="vector-header">
                    <span class="vector-number">{i + 1}</span>
                    <strong>{vector.name}</strong>
                </div>
                <div class="source">
                    <code>{vector.source}</code>
                </div>
                <div class="rendered" data-testid="vector-{i}">
                    <span class="label">Rendered:</span>
                    <SvelteMarkdown source={vector.source} />
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .security-demo {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    .subtitle {
        margin: 0.25rem 0 0.5rem;
        color: #718096;
        font-size: 0.9rem;
    }

    .warning {
        margin: 0 0 1.5rem;
        padding: 0.5rem 0.75rem;
        background: #fff5f5;
        border-left: 3px solid #e53e3e;
        color: #c53030;
        font-size: 0.85rem;
        border-radius: 0 0.25rem 0.25rem 0;
    }

    .vectors {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .vector-card {
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        overflow: hidden;
    }

    .vector-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .vector-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        background: #e2e8f0;
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 600;
        color: #4a5568;
    }

    .source {
        padding: 0.5rem 0.75rem;
        background: #1a202c;
    }

    .source code {
        font-size: 0.8rem;
        color: #e2e8f0;
        word-break: break-all;
    }

    .rendered {
        padding: 0.5rem 0.75rem;
    }

    .label {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #a0aec0;
    }
</style>
