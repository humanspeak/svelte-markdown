import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/svelte'
import { describe, expect, test } from 'vitest'
import SvelteMarkdown from '../src/lib/SvelteMarkdown.svelte'

describe('testing initialization', () => {
    test('accepts pre-processed tokens as source', () => {
        render(SvelteMarkdown, {
            source: [
                {
                    type: 'paragraph',
                    raw: 'this is an **example**',
                    text: 'this is an **example**',
                    tokens: [
                        { type: 'text', raw: 'this is an ', text: 'this is an ' },
                        {
                            type: 'strong',
                            raw: '**example**',
                            text: 'example',
                            tokens: [{ type: 'text', raw: 'example', text: 'example' }]
                        }
                    ]
                }
            ]
        })

        const element = screen.getByText('example')
        expect(element).toBeInTheDocument()
        expect(element.nodeName).toBe('STRONG')
    })
})
