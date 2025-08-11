import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Code from './Code.svelte'

describe('Code (markdown)', () => {
    it('renders pre>code with language class', () => {
        const { container } = render(Code, { props: { lang: 'ts', text: 'const x=1' } })
        const pre = container.querySelector('pre.ts')
        const code = container.querySelector('code')
        expect(pre).toBeTruthy()
        expect(code?.textContent).toBe('const x=1')
    })
})
