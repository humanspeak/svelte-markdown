import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Code from './Code.svelte'

describe('Code (markdown)', () => {
    describe('basic rendering', () => {
        it('renders pre>code with language class', () => {
            const { container } = render(Code, { props: { lang: 'ts', text: 'const x=1' } })
            const pre = container.querySelector('pre.ts')
            const code = container.querySelector('code')
            expect(pre).toBeTruthy()
            expect(code?.textContent).toBe('const x=1')
        })

        it('renders pre>code structure', () => {
            const { container } = render(Code, { props: { lang: 'js', text: 'test' } })
            const pre = container.querySelector('pre')
            const code = pre?.querySelector('code')
            expect(pre).toBeTruthy()
            expect(code).toBeTruthy()
        })
    })

    describe('language classes', () => {
        it('applies javascript language class', () => {
            const { container } = render(Code, { props: { lang: 'javascript', text: 'code' } })
            expect(container.querySelector('pre.javascript')).toBeTruthy()
        })

        it('applies python language class', () => {
            const { container } = render(Code, { props: { lang: 'python', text: 'code' } })
            expect(container.querySelector('pre.python')).toBeTruthy()
        })

        it('applies rust language class', () => {
            const { container } = render(Code, { props: { lang: 'rust', text: 'code' } })
            expect(container.querySelector('pre.rust')).toBeTruthy()
        })

        it('handles empty language string', () => {
            const { container } = render(Code, { props: { lang: '', text: 'code' } })
            const pre = container.querySelector('pre')
            expect(pre).toBeTruthy()
            expect(pre?.className).toBe('')
        })

        it('handles language with hyphen', () => {
            const { container } = render(Code, { props: { lang: 'c-sharp', text: 'code' } })
            expect(container.querySelector('pre.c-sharp')).toBeTruthy()
        })

        it('handles language with numbers', () => {
            const { container } = render(Code, { props: { lang: 'es2015', text: 'code' } })
            expect(container.querySelector('pre.es2015')).toBeTruthy()
        })
    })

    describe('text content', () => {
        it('renders empty text', () => {
            const { container } = render(Code, { props: { lang: 'js', text: '' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('')
        })

        it('renders multiline code', () => {
            const multiline = 'function test() {\n  return true;\n}'
            const { container } = render(Code, { props: { lang: 'js', text: multiline } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe(multiline)
        })

        it('preserves leading whitespace', () => {
            const { container } = render(Code, { props: { lang: 'py', text: '    indented' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('    indented')
        })

        it('preserves trailing whitespace', () => {
            const { container } = render(Code, { props: { lang: 'py', text: 'code   ' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('code   ')
        })

        it('renders code with special characters', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const x = a < b && c > d;' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const x = a < b && c > d;')
        })

        it('renders code with HTML-like tags as text', () => {
            const { container } = render(Code, {
                props: { lang: 'html', text: '<div class="test">content</div>' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('<div class="test">content</div>')
            // Should not create actual div element
            expect(container.querySelector('div.test')).toBeNull()
        })

        it('renders code with backticks', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const str = `template ${var}`' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const str = `template ${var}`')
        })

        it('renders code with quotes', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const s = \'single\' + "double"' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const s = \'single\' + "double"')
        })

        it('renders code with ampersands', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'a && b || c & d' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('a && b || c & d')
        })
    })
})
