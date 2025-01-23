import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Param from './Param.svelte'

describe('Param Component', () => {
    it('should render param element with name and value', () => {
        const { container } = render(Param, {
            props: {
                attributes: {
                    name: 'movie',
                    value: 'movie.swf'
                }
            }
        })
        const param = container.querySelector('param')
        expect(param).toBeTruthy()
        expect(param?.getAttribute('name')).toBe('movie')
        expect(param?.getAttribute('value')).toBe('movie.swf')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Param, {
            props: {
                attributes: {
                    id: 'movie-param',
                    'data-type': 'flash'
                }
            }
        })
        const param = container.querySelector('param')
        expect(param?.getAttribute('id')).toBe('movie-param')
        expect(param?.getAttribute('data-type')).toBe('flash')
    })
})
