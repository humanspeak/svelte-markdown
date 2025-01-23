import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Progress from './Progress.svelte'

describe('Progress Component', () => {
    it('should render progress element with value and max', () => {
        const { container } = render(Progress, {
            props: {
                attributes: {
                    value: '70',
                    max: '100'
                }
            }
        })
        const progress = container.querySelector('progress')
        expect(progress).toBeTruthy()
        expect(progress?.getAttribute('value')).toBe('70')
        expect(progress?.getAttribute('max')).toBe('100')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Progress, {
            props: {
                attributes: {
                    class: 'upload-progress',
                    'aria-label': 'Upload progress',
                    'data-status': 'uploading'
                }
            }
        })
        const progress = container.querySelector('progress')
        expect(progress?.getAttribute('class')).toBe('upload-progress')
        expect(progress?.getAttribute('aria-label')).toBe('Upload progress')
        expect(progress?.getAttribute('data-status')).toBe('uploading')
    })
})
