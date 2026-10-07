import { describe, expect, it } from 'vitest'
import { collectComponentImports, extractLeadingScripts } from './script-block.js'

describe('extractLeadingScripts', () => {
    it('returns the document untouched when there is no script block', () => {
        expect(extractLeadingScripts('# Hello')).toEqual({ scripts: [], content: '# Hello' })
    })

    it('pulls a leading script block off the front of the document', () => {
        const { scripts, content } = extractLeadingScripts(
            "<script>\n  import A from './A.svelte'\n</script>\n\n# Body"
        )
        expect(scripts).toHaveLength(1)
        expect(scripts[0].code).toContain("import A from './A.svelte'")
        expect(content).toBe('\n# Body')
    })

    it('captures script attributes so module blocks can be told apart', () => {
        const { scripts } = extractLeadingScripts(
            '<script module>\n  export const x = 1\n</script>\n<script>\n  const y = 2\n</script>\n'
        )
        expect(scripts.map((s) => s.attrs)).toEqual(['module', ''])
    })

    it('leaves script tags inside fenced code blocks alone', () => {
        const source = '# Title\n\n```html\n<script>alert(1)</script>\n```\n'
        const { scripts, content } = extractLeadingScripts(source)
        expect(scripts).toEqual([])
        expect(content).toBe(source)
    })
})

describe('collectComponentImports', () => {
    it('collects default and named capitalized imports', () => {
        const names = collectComponentImports(
            [
                "import Counter from './Counter.svelte'",
                "import Alert, { Banner } from './widgets.js'",
                "import { Card as Panel } from './card.js'"
            ].join('\n')
        )
        expect(names).toEqual(['Counter', 'Alert', 'Banner', 'Panel'])
    })

    it('ignores lowercase bindings and type-only imports', () => {
        const names = collectComponentImports(
            [
                "import helper from './helper.js'",
                "import { util } from './util.js'",
                "import type Thing from './thing.js'",
                "import { type Other } from './other.js'"
            ].join('\n')
        )
        expect(names).toEqual([])
    })

    it('deduplicates repeated names', () => {
        const names = collectComponentImports("import A from './a.js'\nimport { A } from './b.js'")
        expect(names).toEqual(['A'])
    })

    it('returns nothing for a script with no imports', () => {
        expect(collectComponentImports('const x = 1')).toEqual([])
    })
})
