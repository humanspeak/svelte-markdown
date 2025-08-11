import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Hr from './Hr.svelte'

describe('Hr (markdown)', () => {
    it('renders hr', () => {
        const { container } = render(Hr)
        expect(container.querySelector('hr')).toBeTruthy()
    })
})
