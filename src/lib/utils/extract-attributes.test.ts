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
})
