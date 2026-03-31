import type { SvelteMarkdownOptions } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'

describe('IncrementalParser', () => {
    const defaultOptions: SvelteMarkdownOptions = { gfm: true }

    describe('Basic Parsing', () => {
        it('should parse simple markdown', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('# Hello World')

            expect(result.tokens).toBeDefined()
            expect(result.tokens.length).toBeGreaterThan(0)
            expect(result.tokens[0].type).toBe('heading')
            expect(result.divergeAt).toBe(0)
        })

        it('should parse empty string as empty array', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('')

            expect(result.tokens).toEqual([])
            expect(result.divergeAt).toBe(0)
        })

        it('should parse multiple block elements', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('# Heading\n\nParagraph text\n\n- Item 1\n- Item 2')

            expect(result.tokens.length).toBeGreaterThanOrEqual(3)
        })
    })

    describe('Incremental Diffing', () => {
        it('should detect unchanged tokens on identical input', () => {
            const parser = new IncrementalParser(defaultOptions)
            parser.update('# Hello\n\nWorld')
            const result = parser.update('# Hello\n\nWorld')

            expect(result.divergeAt).toBe(result.tokens.length)
        })

        it('should detect divergence when appending a new block', () => {
            const parser = new IncrementalParser(defaultOptions)
            const r1 = parser.update('# Hello\n\nFirst paragraph')
            const firstCount = r1.tokens.length

            const r2 = parser.update('# Hello\n\nFirst paragraph\n\nSecond paragraph')
            expect(r2.tokens.length).toBeGreaterThan(firstCount)
            expect(r2.divergeAt).toBeLessThan(r2.tokens.length)
        })

        it('should report divergeAt 0 on first parse', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('# Hello')

            expect(result.divergeAt).toBe(0)
        })

        it('should detect change in last token when appending text', () => {
            const parser = new IncrementalParser(defaultOptions)
            parser.update('# Hello\n\nSome text')
            const result = parser.update('# Hello\n\nSome text with more')

            expect(result.divergeAt).toBe(1)
            expect(result.tokens[0].type).toBe('heading')
        })

        it('should handle growing lists correctly', () => {
            const parser = new IncrementalParser(defaultOptions)
            parser.update('- Item 1\n- Item 2')
            const result = parser.update('- Item 1\n- Item 2\n- Item 3')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('list')
            expect(result.divergeAt).toBe(0)
        })

        it('should preserve heading when paragraph grows', () => {
            const parser = new IncrementalParser(defaultOptions)
            const r1 = parser.update('# Title\n\nFirst paragraph')
            const headingRaw = r1.tokens[0].raw

            const r2 = parser.update('# Title\n\nFirst paragraph with more text')
            expect(r2.tokens[0].raw).toBe(headingRaw)
            expect(r2.divergeAt).toBe(1)
        })
    })

    describe('Code Fences', () => {
        it('should parse complete code fences correctly', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('```javascript\nconst x = 1\n```')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('code')
        })

        it('should handle code fence streamed incrementally', () => {
            const parser = new IncrementalParser(defaultOptions)

            const r1 = parser.update('```javascript\nconst x')
            expect(r1.tokens.length).toBeGreaterThan(0)

            const r2 = parser.update('```javascript\nconst x = 1\n```')
            expect(r2.tokens[0].type).toBe('code')
        })
    })

    describe('Tables', () => {
        it('should parse tables correctly', () => {
            const parser = new IncrementalParser(defaultOptions)
            const result = parser.update('| A | B |\n|---|---|\n| 1 | 2 |')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('table')
        })
    })

    describe('walkTokens Support', () => {
        it('should call walkTokens on parsed tokens', () => {
            const walked: string[] = []
            const options: SvelteMarkdownOptions = {
                gfm: true,
                walkTokens: (token) => {
                    walked.push(token.type)
                }
            }
            const parser = new IncrementalParser(options)
            parser.update('# Hello\n\nWorld')

            expect(walked.length).toBeGreaterThan(0)
            expect(walked).toContain('heading')
        })
    })
})
