import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import CustomTagComponent from './CustomTagComponent.svelte'
import CustomTagPrecedence from './CustomTagPrecedence.svelte'
import SnippetCustomTag from './SnippetCustomTag.svelte'

describe('Custom HTML Tags', () => {
    describe('Component renderer approach', () => {
        it('renders custom tag via component renderer', () => {
            const { container } = render(CustomTagComponent, {
                props: { source: '<click>Click Me</click>' }
            })
            const btn = container.querySelector('[data-testid="custom-tag-component"]')
            expect(btn).toBeTruthy()
            expect(btn?.textContent).toContain('Click Me')
        })

        it('renders child content inside custom tag component', () => {
            const { container } = render(CustomTagComponent, {
                props: { source: '<click>Hello <strong>World</strong></click>' }
            })
            const btn = container.querySelector('[data-testid="custom-tag-component"]')
            expect(btn).toBeTruthy()
            expect(btn?.textContent).toContain('Hello')
        })
    })

    describe('Snippet override approach', () => {
        it('renders custom tag via snippet override', () => {
            const { container } = render(SnippetCustomTag, {
                props: { source: '<click>Click Me</click>' }
            })
            const btn = container.querySelector('[data-testid="custom-tag-snippet"]')
            expect(btn).toBeTruthy()
            expect(btn?.textContent).toContain('Click Me')
        })

        it('renders child content inside custom tag snippet', () => {
            const { container } = render(SnippetCustomTag, {
                props: { source: '<click>Hello <em>World</em></click>' }
            })
            const btn = container.querySelector('[data-testid="custom-tag-snippet"]')
            expect(btn).toBeTruthy()
            expect(btn?.textContent).toContain('Hello')
        })

        it('forwards attributes on custom tag snippet', () => {
            const { container } = render(SnippetCustomTag, {
                props: { source: '<click data-action="submit">Go</click>' }
            })
            const btn = container.querySelector('[data-testid="custom-tag-snippet"]')
            expect(btn).toBeTruthy()
            expect(btn?.getAttribute('data-action')).toBe('submit')
        })
    })

    describe('Precedence', () => {
        it('snippet wins over component renderer for custom tags', () => {
            const { container } = render(CustomTagPrecedence, {
                props: { source: '<click>Click Me</click>' }
            })
            // Snippet should win
            expect(container.querySelector('[data-testid="custom-tag-snippet"]')).toBeTruthy()
            // Component renderer marker should NOT be present
            expect(container.querySelector('[data-testid="custom-tag-component"]')).toBeFalsy()
        })
    })
})
