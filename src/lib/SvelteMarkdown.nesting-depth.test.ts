import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'

/** Longest chain of nested elements matching `selector`. */
const nestedCount = (container: Element, selector: string): number => {
    let max = 0
    for (const el of container.querySelectorAll(selector)) {
        let depth = 0
        for (let node: Element | null = el; node; node = node.parentElement) {
            if (node.matches(selector)) depth++
        }
        max = Math.max(max, depth)
    }
    return max
}

const cases: [string, string, (n: number) => string, number][] = [
    ['blockquotes', 'blockquote', (n) => '> '.repeat(n) + 'deep', 16],
    [
        'lists',
        'ul',
        (n) => Array.from({ length: n }, (_, i) => '  '.repeat(i) + '- item').join('\n'),
        8
    ],
    ['html tags', 'div.x', (n) => '<div class="x">'.repeat(n) + 'deep' + '</div>'.repeat(n), 16]
]

describe('SvelteMarkdown nesting depth guard (HUM-132)', () => {
    describe.each([false, true])('streaming=%s', (streaming) => {
        it.each(cases)('renders 200 nested %s without throwing', (_n, selector, make, cap) => {
            const { container } = render(SvelteMarkdown, { source: make(200), streaming })
            expect(nestedCount(container, selector)).toBe(cap)
            expect(container.textContent).toContain(selector === 'ul' ? '- item' : 'deep')
        })

        it('renders source so deep the lexer overflows as plain text', () => {
            const source = '> '.repeat(20000) + 'deep'
            const { container } = render(SvelteMarkdown, { source, streaming })
            expect(container.querySelector('blockquote')).toBeNull()
            expect(container.textContent).toContain('> > deep')
        })
    })

    it('shows over-deep html as escaped text, not markup', () => {
        const source =
            '<div>'.repeat(17) + '<img src="x.png" onerror="alert(1)">' + '</div>'.repeat(17)
        const { container } = render(SvelteMarkdown, { source })
        expect(container.querySelector('img')).toBeNull()
        expect(container.textContent).toContain('<img')
    })

    it('keeps formatting inside the deepest allowed blockquote', () => {
        const source =
            '> '.repeat(16) + '**bold** x\n' + '> '.repeat(16) + '\n' + '> '.repeat(16) + 'second'
        const { container } = render(SvelteMarkdown, { source })
        expect(nestedCount(container, 'blockquote')).toBe(16)
        const deepest = [...container.querySelectorAll('blockquote')].at(-1)!
        expect(deepest.querySelector('strong')?.textContent).toBe('bold')
        expect(deepest.querySelectorAll('p')).toHaveLength(2)
    })

    it('respects options.maxNestingDepth', () => {
        const source = '> '.repeat(10) + 'deep'
        const capped = render(SvelteMarkdown, { source, options: { maxNestingDepth: 3 } })
        expect(nestedCount(capped.container, 'blockquote')).toBe(3)
        const open = render(SvelteMarkdown, { source })
        expect(nestedCount(open.container, 'blockquote')).toBe(10)
    })
})
