import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Article from './Article.svelte'

describe('Article Component', () => {
    it('should render article element', () => {
        const { container } = render(Article, {
            props: {
                attributes: {
                    class: 'blog-post'
                }
            }
        })
        const article = container.querySelector('article')
        expect(article).toBeTruthy()
        expect(article?.getAttribute('class')).toBe('blog-post')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Article, {
            props: {
                attributes: {
                    id: 'featured-post',
                    role: 'article',
                    'aria-label': 'Featured Article'
                }
            }
        })
        const article = container.querySelector('article')
        expect(article?.getAttribute('id')).toBe('featured-post')
        expect(article?.getAttribute('role')).toBe('article')
        expect(article?.getAttribute('aria-label')).toBe('Featured Article')
    })
})
