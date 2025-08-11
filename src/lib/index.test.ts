import { describe, expect, it } from 'vitest'
import SvelteMarkdown, {
    type SvelteMarkdownOptions,
    type SvelteMarkdownProps,
    type Token,
    type TokensList
} from './index.js'

describe('index.ts exports', () => {
    it('should export SvelteMarkdown as default export', () => {
        expect(SvelteMarkdown).toBeDefined()
        expect(typeof SvelteMarkdown).toBe('function')
    })

    it('should export all required types', () => {
        // We can't directly test types at runtime, but we can verify the imports work
        const dummyOptions: SvelteMarkdownOptions = {
            breaks: true,
            headerIds: true
        }
        expect(dummyOptions).toBeDefined()

        // Create dummy token to verify type exports
        const dummyToken: Token = {
            type: 'paragraph',
            raw: 'test',
            text: 'test'
        }
        expect(dummyToken).toBeDefined()

        // Create dummy tokens list to verify type exports
        const dummyTokensList: TokensList = Object.assign([dummyToken], { links: {} as any })
        expect(dummyTokensList).toBeDefined()
        expect(Array.isArray(dummyTokensList)).toBe(true)
    })

    it('should export SvelteMarkdownProps type', () => {
        // Verify props type can be used
        const dummyProps: SvelteMarkdownProps = {
            source: '# Test',
            options: {
                breaks: true
            },
            isInline: false
        }
        expect(dummyProps).toBeDefined()
        expect(dummyProps.source).toBe('# Test')
    })
})
