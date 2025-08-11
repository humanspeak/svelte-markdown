import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import ListItem from './ListItem.svelte'

describe('ListItem (markdown)', () => {
    it('renders li element', () => {
        const { container } = render(ListItem)
        expect(container.querySelector('li')).toBeTruthy()
    })
})
