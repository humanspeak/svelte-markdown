import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Em from './Em.svelte'

describe('Em (markdown)', () => {
    it('renders em element', () => {
        const { container } = render(Em)
        expect(container.querySelector('em')).toBeTruthy()
    })
})
