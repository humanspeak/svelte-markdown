import { describe, expect, it } from 'vitest'
import { extractFrontmatter } from './frontmatter.js'
import { markdown } from './index.js'

const run = (content: string, filename = '/routes/+page.md', options = {}) =>
    markdown(options).markup({ content, filename })

describe('markdown preprocessor', () => {
    it('ignores files outside the configured extensions', () => {
        expect(run('# hi', '/routes/+page.svelte')).toBeUndefined()
        expect(markdown().markup({ content: '# hi' })).toBeUndefined()
    })

    it('wraps markdown in a component that renders the source', () => {
        const result = run('# Hello')
        expect(result?.code).toContain('import Document__ from')
        expect(result?.code).toContain('<Document__ source={source__} />')
        expect(result?.code).toContain('const source__ = "# Hello"')
    })

    it('escapes closing script tags so the generated script block is not cut short', () => {
        const result = run('```html\n<script>alert(1)</script>\n```')
        // A literal `</script>` would terminate the emitted <script> block and
        // break the Svelte parser with "Unterminated string constant".
        expect(result?.code).not.toMatch(/<\/script>\\n```/)
        expect(result?.code).toContain('<\\/script>')
        // The only real closing tag is the one that ends the instance script.
        expect(result?.code.match(/<\/script>/g)).toHaveLength(2)
    })

    it('exports front matter as module metadata and strips it from the source', () => {
        const result = run('---\ntitle: Post\ndraft: false\n---\n\n# Body')
        expect(result?.code).toContain('<script module>')
        expect(result?.code).toContain('export const metadata = {"title":"Post","draft":false}')
        expect(result?.code).toContain('const source__ = "\\n# Body"')
    })

    it('wraps output in a layout component when one is configured', () => {
        const result = run('# Hello', '/routes/+page.md', { layout: '$lib/Layout.svelte' })
        expect(result?.code).toContain('import Layout__ from "$lib/Layout.svelte"')
        expect(result?.code).toContain('<Layout__ {...metadata}>')
        expect(result?.code).toContain('</Layout__>')
    })

    it('honours a custom document specifier and extension list', () => {
        const result = run('# Hello', '/routes/post.markdown', {
            extensions: ['.markdown'],
            document: './Custom.svelte'
        })
        expect(result?.code).toContain('import Document__ from "./Custom.svelte"')
    })
})

describe('extractFrontmatter', () => {
    it('returns the whole document when there is no front matter', () => {
        expect(extractFrontmatter('# Hello')).toEqual({ data: {}, content: '# Hello' })
    })

    it('parses scalars, inline arrays, quotes and comments', () => {
        const { data } = extractFrontmatter(
            [
                '---',
                '# a comment',
                'title: "Quoted Title"',
                "author: 'Single'",
                'order: 12',
                'ratio: -1.5',
                'draft: true',
                'published: false',
                'empty:',
                'missing: null',
                'tilde: ~',
                'tags: [a, b]',
                'none: []',
                'no-colon-line',
                ': novalue',
                '---',
                'body'
            ].join('\n')
        )
        expect(data).toEqual({
            title: 'Quoted Title',
            author: 'Single',
            order: 12,
            ratio: -1.5,
            draft: true,
            published: false,
            empty: '',
            missing: null,
            tilde: null,
            tags: ['a', 'b'],
            none: []
        })
    })

    it('strips the front matter block from the content', () => {
        expect(extractFrontmatter('---\ntitle: x\n---\n# Body').content).toBe('# Body')
    })
})

describe('markdown preprocessor script blocks', () => {
    it('hoists a leading script block and registers its components', () => {
        const result = run("<script>\n\timport Counter from './Counter.svelte'\n</script>\n\n# Hi")
        expect(result?.code).toContain("import Counter from './Counter.svelte'")
        expect(result?.code).toContain('const components__ = { Counter }')
        expect(result?.code).toContain('<Document__ source={source__} components={components__} />')
        expect(result?.code).toContain('const source__ = "\\n# Hi"')
    })

    it('puts module script blocks in the module context', () => {
        const result = run('<script module>\n\texport const answer = 42\n</script>\n\n# Hi')
        const moduleBlock = result?.code.split('</script>')[0] ?? ''
        expect(moduleBlock).toContain('export const answer = 42')
    })

    it('omits the components prop when nothing component-like is imported', () => {
        const result = run('<script>\n\tconst x = 1\n</script>\n\n# Hi')
        expect(result?.code).toContain('const x = 1')
        expect(result?.code).not.toContain('components__')
        expect(result?.code).toContain('<Document__ source={source__} />')
    })
})
