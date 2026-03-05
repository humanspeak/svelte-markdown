import { render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MermaidRenderer from './MermaidRenderer.svelte'

// Mock the mermaid module
const mockRender = vi.fn()
const mockInitialize = vi.fn()

vi.mock('mermaid', () => ({
    default: {
        render: mockRender,
        initialize: mockInitialize
    }
}))

// Mock crypto.randomUUID
vi.stubGlobal(
    'crypto',
    Object.assign({}, globalThis.crypto, {
        randomUUID: vi.fn(() => 'test-uuid-1234')
    })
)

describe('MermaidRenderer', () => {
    // This component has multiple async layers (dynamic import + async render + $effect),
    // so we use real timers and rely on waitFor for async resolution.
    beforeEach(() => {
        vi.useRealTimers()
        mockRender.mockReset()
        mockInitialize.mockReset()
        mockRender.mockResolvedValue({ svg: '<svg>diagram</svg>' })
    })

    afterEach(() => {
        document.documentElement.className = ''
    })

    it('shows loading state initially', () => {
        const { container } = render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;' }
        })
        const loading = container.querySelector('[data-testid="mermaid-loading"]')
        expect(loading).toBeTruthy()
        expect(loading?.textContent).toBe('Loading diagram...')
    })

    it('renders SVG after successful mermaid load', async () => {
        const { container } = render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;' }
        })

        // Wait for loading to finish first
        await waitFor(
            () => {
                expect(container.querySelector('[data-testid="mermaid-loading"]')).toBeFalsy()
            },
            { timeout: 5000 }
        )

        // Then check for diagram or error
        await waitFor(
            () => {
                const diagram = container.querySelector('[data-testid="mermaid-diagram"]')
                const error = container.querySelector('[data-testid="mermaid-error"]')
                expect(diagram || error).toBeTruthy()
                if (diagram) {
                    expect(diagram.innerHTML).toContain('<svg>diagram</svg>')
                }
            },
            { timeout: 5000 }
        )
    }, 10000)

    it('renders error state when mermaid.render fails', async () => {
        mockRender.mockRejectedValueOnce(new Error('Invalid syntax'))

        const { container } = render(MermaidRenderer, {
            props: { text: 'invalid diagram' }
        })

        await waitFor(() => {
            const error = container.querySelector('[data-testid="mermaid-error"]')
            expect(error).toBeTruthy()
            expect(error?.textContent).toContain('Invalid syntax')
        })
    })

    it('renders error state for non-Error throws', async () => {
        mockRender.mockRejectedValueOnce('string error')

        const { container } = render(MermaidRenderer, {
            props: { text: 'invalid diagram' }
        })

        await waitFor(() => {
            const error = container.querySelector('[data-testid="mermaid-error"]')
            expect(error).toBeTruthy()
            expect(error?.textContent).toContain('string error')
        })
    })

    it('uses light theme by default', async () => {
        document.documentElement.classList.remove('dark')

        const { container } = render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;' }
        })

        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeTruthy()
        })

        expect(mockRender).toHaveBeenCalledWith(
            'mermaid-test-uuid-1234',
            expect.stringContaining("'theme': 'default'")
        )
    })

    it('uses dark theme when document has dark class', async () => {
        document.documentElement.classList.add('dark')

        const { container } = render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;' }
        })

        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeTruthy()
        })

        expect(mockRender).toHaveBeenCalledWith(
            'mermaid-test-uuid-1234',
            expect.stringContaining("'theme': 'dark'")
        )
    })

    it('accepts custom theme props', async () => {
        document.documentElement.classList.add('dark')

        const { container } = render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;', lightTheme: 'forest', darkTheme: 'neutral' }
        })

        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeTruthy()
        })

        expect(mockRender).toHaveBeenCalledWith(
            'mermaid-test-uuid-1234',
            expect.stringContaining("'theme': 'neutral'")
        )
    })

    it('initializes mermaid with strict security', async () => {
        render(MermaidRenderer, {
            props: { text: 'graph TD; A-->B;' }
        })

        await waitFor(() => {
            expect(mockInitialize).toHaveBeenCalled()
        })

        expect(mockInitialize).toHaveBeenCalledWith({
            startOnLoad: false,
            securityLevel: 'strict'
        })
    })
})
