import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import AlertRenderer from './AlertRenderer.svelte'
import type { AlertType } from './markedAlert.js'

describe('AlertRenderer', () => {
    const alertTypes: AlertType[] = ['note', 'tip', 'important', 'warning', 'caution']

    it.each(alertTypes)('renders %s alert with correct class and title', (alertType) => {
        const { container } = render(AlertRenderer, {
            props: { text: 'Alert content', alertType }
        })
        const div = container.querySelector('.markdown-alert')
        expect(div).toBeTruthy()
        expect(div?.classList.contains(`markdown-alert-${alertType}`)).toBe(true)
        expect(div?.getAttribute('role')).toBe('note')

        const title = container.querySelector('.markdown-alert-title')
        const expectedTitle = alertType.charAt(0).toUpperCase() + alertType.slice(1)
        expect(title?.textContent).toBe(expectedTitle)
    })

    it('renders the text content', () => {
        const { container } = render(AlertRenderer, {
            props: { text: 'This is a warning message', alertType: 'warning' }
        })
        const paragraphs = container.querySelectorAll('p')
        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[1].textContent).toBe('This is a warning message')
    })
})
