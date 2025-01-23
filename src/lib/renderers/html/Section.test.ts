import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Section from './Section.svelte'

describe('Section Component', () => {
    it('should render section element', () => {
        const { container } = render(Section, {
            props: {
                attributes: {
                    class: 'content-section'
                }
            }
        })
        const section = container.querySelector('section')
        expect(section).toBeTruthy()
        expect(section?.getAttribute('class')).toBe('content-section')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Section, {
            props: {
                attributes: {
                    id: 'main-section',
                    'aria-label': 'Main content section',
                    role: 'region',
                    'data-section-type': 'content'
                }
            }
        })
        const section = container.querySelector('section')
        expect(section?.getAttribute('id')).toBe('main-section')
        expect(section?.getAttribute('aria-label')).toBe('Main content section')
        expect(section?.getAttribute('role')).toBe('region')
        expect(section?.getAttribute('data-section-type')).toBe('content')
    })
})
