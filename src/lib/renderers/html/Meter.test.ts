import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Meter from './Meter.svelte'

describe('Meter Component', () => {
    it('should render meter element with basic attributes', () => {
        const { container } = render(Meter, {
            props: {
                attributes: {
                    value: '0.8',
                    min: '0',
                    max: '1',
                    class: 'progress-meter'
                }
            }
        })
        const meter = container.querySelector('meter')
        expect(meter).toBeTruthy()
        expect(meter?.getAttribute('value')).toBe('0.8')
        expect(meter?.getAttribute('min')).toBe('0')
        expect(meter?.getAttribute('max')).toBe('1')
        expect(meter?.getAttribute('class')).toBe('progress-meter')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Meter, {
            props: {
                attributes: {
                    low: '0.2',
                    high: '0.8',
                    optimum: '0.5',
                    'aria-label': 'Progress indicator',
                    id: 'task-progress'
                }
            }
        })
        const meter = container.querySelector('meter')
        expect(meter?.getAttribute('low')).toBe('0.2')
        expect(meter?.getAttribute('high')).toBe('0.8')
        expect(meter?.getAttribute('optimum')).toBe('0.5')
        expect(meter?.getAttribute('aria-label')).toBe('Progress indicator')
        expect(meter?.getAttribute('id')).toBe('task-progress')
    })
})
