import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from '../../../SvelteMarkdown.svelte'

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
        expect(container).toHaveTextContent(/\* We define “BEST” as:/)
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
        const strongs = p!.querySelectorAll('strong')
        expect(strongs.length).toBe(2)
        expect(strongs[0].textContent).toBe('*')
        expect(p).toHaveTextContent(/^\*\s+We define/i)
        expect(strongs[1].textContent).toBe('BEST')
        expect(p).toHaveTextContent(/BEST\s+as:$/i)
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
            props: { source: tokensSource }
        })
        const { container: c2 } = render(SvelteMarkdown, {
            props: { source: '**\\*** We define “BEST” as:' }
        })

        await vi.runAllTimersAsync()

        const normalize = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
        expect(normalize(c1.innerHTML)).toBe(normalize(c2.innerHTML))
    })
})
