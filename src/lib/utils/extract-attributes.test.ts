import { describe, expect, it } from 'vitest'
import { extractAttributes } from './token-cleanup.js'

describe('extractAttributes', () => {
    it('should extract basic attributes', () => {
        const html = '<div class="container" id="main">'
        expect(extractAttributes(html)).toEqual({
            class: 'container',
            id: 'main'
        })
    })

    it('should handle attributes with spaces in values', () => {
        const html = '<div class="container fluid" style="color: red; margin: 10px">'
        expect(extractAttributes(html)).toEqual({
            class: 'container fluid',
            style: 'color: red; margin: 10px'
        })
    })

    it('should handle single quotes', () => {
        const html = "<div class='single-quote' data-test='value'>"
        expect(extractAttributes(html)).toEqual({
            class: 'single-quote',
            'data-test': 'value'
        })
    })

    it('should handle boolean attributes', () => {
        const html = '<input type="checkbox" checked disabled>'
        expect(extractAttributes(html)).toEqual({
            type: 'checkbox',
            checked: '',
            disabled: ''
        })
    })

    it('should handle data attributes', () => {
        const html = '<div data-test-id="123" data-role="button">'
        expect(extractAttributes(html)).toEqual({
            'data-test-id': '123',
            'data-role': 'button'
        })
    })

    it('should handle empty attributes', () => {
        const html = '<div class="" id="">'
        expect(extractAttributes(html)).toEqual({
            class: '',
            id: ''
        })
    })

    it('should handle no attributes', () => {
        const html = '<div>'
        expect(extractAttributes(html)).toEqual({})
    })

    it('should handle malformed HTML gracefully', () => {
        const html = '<div class="unclosed'
        expect(extractAttributes(html)).toEqual({
            class: 'unclosed'
        })
    })

    it('should handle attributes with special characters', () => {
        const html = '<div data-special="!@#$%^&*()">'
        expect(extractAttributes(html)).toEqual({
            'data-special': '!@#$%^&*()'
        })
    })

    it('should handle attributes with equals signs in values', () => {
        const html = '<div style="width: calc(100% - 20px);">'
        expect(extractAttributes(html)).toEqual({
            style: 'width: calc(100% - 20px);'
        })
    })

    // https://github.com/humanspeak/svelte-markdown/issues/297
    it('should not treat words inside a quoted value as boolean attributes (issue 297)', () => {
        const html = '<Tip title="foo bar baz">'
        expect(extractAttributes(html)).toEqual({
            title: 'foo bar baz'
        })
    })

    it('should ignore tokens inside multiple quoted values that look like boolean attrs', () => {
        const html = '<Card title="one two" subtitle="three four five">'
        expect(extractAttributes(html)).toEqual({
            title: 'one two',
            subtitle: 'three four five'
        })
    })

    it('should ignore tokens inside single-quoted values with spaces', () => {
        const html = "<Tip title='foo bar baz'>"
        expect(extractAttributes(html)).toEqual({
            title: 'foo bar baz'
        })
    })

    it('should keep real boolean attributes alongside a quoted value with spaces', () => {
        const html = '<input type="text input" required>'
        expect(extractAttributes(html)).toEqual({
            type: 'text input',
            required: ''
        })
    })

    it('should not capture the value of an unclosed quoted attribute as a boolean attr', () => {
        const html = '<div class="foo bar'
        expect(extractAttributes(html)).toEqual({
            class: 'foo bar'
        })
    })

    it('preserves an apostrophe inside a double-quoted value', () => {
        expect(extractAttributes(`<img alt="it's a cat" src="/c.png">`)).toEqual({
            alt: "it's a cat",
            src: '/c.png'
        })
    })

    it('preserves a double quote inside a single-quoted value', () => {
        expect(extractAttributes(`<div title='say "hi"' id="x">`)).toEqual({
            title: 'say "hi"',
            id: 'x'
        })
    })

    it('does not truncate URLs containing an apostrophe', () => {
        expect(extractAttributes(`<a href="https://x.com/?a='b&c=d" title="hi">`)).toEqual({
            href: "https://x.com/?a='b&c=d",
            title: 'hi'
        })
    })

    it('closes an unclosed value containing an other-type quote at end of string', () => {
        expect(extractAttributes(`<div title="it's unfinished`)).toEqual({
            title: "it's unfinished"
        })
    })
})
