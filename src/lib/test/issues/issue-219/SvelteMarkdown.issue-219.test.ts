import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from '../../../SvelteMarkdown.svelte'

beforeEach(() => {
    vi.useFakeTimers()
})

describe('test issue 219', () => {
    test('renders escaped asterisk in bold from markdown string source', async () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '**\\*** We define “BEST” as:'
            }
        })

        await vi.runAllTimersAsync()

        const strongs = container.querySelectorAll('strong')
        expect(strongs.length).toBeGreaterThanOrEqual(1)
        expect(strongs[0].textContent).toBe('*')

        // Ensure the following text remains intact
        expect(container.textContent?.includes('* We define “BEST” as:')).toBe(true)
    })

    test('handles multiple strong segments including escaped asterisk', async () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '**\\*** We define **BEST** as:'
            }
        })

        await vi.runAllTimersAsync()

        const p = container.querySelector('p')
        expect(p).toBeInTheDocument()

        const meaningfulNodes = Array.from(p!.childNodes).filter(
            (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
        )

        // Build a simplified sequence ignoring Svelte comment anchors
        const sequence = meaningfulNodes.map((n) => {
            if (n.nodeType === 1) {
                const el = n as Element
                return `<${el.tagName}>${el.textContent}`
            }
            return (n.textContent ?? '').replace(/\s+/g, ' ').trim()
        })

        // Expect order: <STRONG>*</STRONG>, text contains 'We define', <STRONG>BEST</STRONG>, text contains 'as:'
        const firstStrongIdx = sequence.findIndex(
            (s) => s.startsWith('<STRONG>') && s.endsWith('*')
        )
        expect(firstStrongIdx).toBeGreaterThanOrEqual(0)

        const afterFirstTextIdx = sequence.findIndex(
            (s, i) => i > firstStrongIdx && !s.startsWith('<STRONG>') && s.includes('We define')
        )
        expect(afterFirstTextIdx).toBeGreaterThan(firstStrongIdx)

        const secondStrongIdx = sequence.findIndex(
            (s, i) => i > afterFirstTextIdx && s.startsWith('<STRONG>') && s.endsWith('BEST')
        )
        expect(secondStrongIdx).toBeGreaterThan(afterFirstTextIdx)

        const trailingTextIdx = sequence.findIndex(
            (s, i) => i > secondStrongIdx && !s.startsWith('<STRONG>') && s.includes('as:')
        )
        expect(trailingTextIdx).toBeGreaterThan(secondStrongIdx)
    })

    test('DOM equivalence between tokens input and markdown string', async () => {
        const tokensSource = [
            {
                type: 'paragraph',
                raw: '**\\*** We define “BEST” as:',
                text: '**\\*** We define “BEST” as:',
                tokens: [
                    {
                        type: 'strong',
                        raw: '**\\***',
                        text: '\\*',
                        tokens: [
                            {
                                type: 'escape',
                                raw: '\\*',
                                text: '*'
                            }
                        ]
                    },
                    {
                        type: 'text',
                        raw: ' We define “BEST” as:',
                        text: ' We define “BEST” as:',
                        escaped: false
                    }
                ]
            }
        ]

        const { container: c1 } = render(SvelteMarkdown, {
            props: { source: tokensSource as unknown as string }
        })
        const { container: c2 } = render(SvelteMarkdown, {
            props: { source: '**\\*** We define “BEST” as:' }
        })

        await vi.runAllTimersAsync()

        const normalize = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
        expect(normalize(c1.innerHTML)).toBe(normalize(c2.innerHTML))
    })
})
