import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Dialog from './Dialog.svelte'

describe('Dialog Component', () => {
    it('should render dialog element with open state', () => {
        const { container } = render(Dialog, {
            props: {
                attributes: {
                    open: ''
                }
            }
        })
        const dialog = container.querySelector('dialog')
        expect(dialog).toBeTruthy()
        expect(dialog?.hasAttribute('open')).toBe(true)
    })

    it('should handle additional attributes', () => {
        const { container } = render(Dialog, {
            props: {
                attributes: {
                    class: 'modal-dialog',
                    'aria-labelledby': 'dialog-title',
                    'aria-describedby': 'dialog-content'
                }
            }
        })
        const dialog = container.querySelector('dialog')
        expect(dialog?.getAttribute('class')).toBe('modal-dialog')
        expect(dialog?.getAttribute('aria-labelledby')).toBe('dialog-title')
        expect(dialog?.getAttribute('aria-describedby')).toBe('dialog-content')
    })
})
