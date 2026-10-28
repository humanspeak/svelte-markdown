/**
 * Open-fence rendering: while a mermaid fence is still streaming (`closed: false`),
 * the renderer keeps the last good diagram on screen and never shows the error
 * box. Once the fence closes, errors are shown as before. Uses sync stub engines
 * so it runs without mermaid.js.
 */

import '@testing-library/jest-dom'
import { render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MermaidEngine } from './mermaidEngine.js'
import MermaidRenderer from './MermaidRenderer.svelte'

const mockRender = vi.fn()
const mockInitialize = vi.fn()

vi.mock('mermaid', () => ({
    default: {
        render: mockRender,
        initialize: mockInitialize
    }
}))

/** Engine that renders any text except 'bad', which produces an error result. */
const failOnBad = () => {
    const engineRender = vi.fn((text: string) =>
        text === 'bad' ? { error: 'boom' } : { svg: `<svg data-text="${text}">${text}</svg>` }
    )
    const engine: MermaidEngine = { render: engineRender }
    return { engine, engineRender }
}

beforeEach(() => {
    // The global setup uses fake timers; waitFor and the effect need real ones.
    vi.useRealTimers()
})

afterEach(() => {
    document.documentElement.className = ''
    mockRender.mockReset()
    mockInitialize.mockReset()
})

describe('MermaidRenderer open fences', () => {
    test('shows the loading placeholder and skips the engine while the open fence has no text', () => {
        const { engine, engineRender } = failOnBad()
        const { container } = render(MermaidRenderer, {
            props: { text: '', closed: false, engine }
        })
        expect(container.querySelector('[data-testid="mermaid-loading"]')).toBeTruthy()
        expect(engineRender).not.toHaveBeenCalled()
        expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeNull()
    })

    test('keeps the last good svg on screen when an open fence becomes invalid', async () => {
        const { engine, engineRender } = failOnBad()
        const { container, rerender } = render(MermaidRenderer, {
            props: { text: 'A-->B', closed: false, engine }
        })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                'A-->B'
            )
        })

        await rerender({ text: 'bad', closed: false, engine })

        await waitFor(() => {
            expect(engineRender).toHaveBeenCalledWith('bad', expect.anything())
        })
        expect(container.querySelector('[data-testid="mermaid-error"]')).toBeNull()
        expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
            'A-->B'
        )
    })

    test('shows the loading placeholder, not an error, when the first render of an open fence fails', async () => {
        const { engine, engineRender } = failOnBad()
        const { container } = render(MermaidRenderer, {
            props: { text: 'bad', closed: false, engine }
        })
        await waitFor(() => {
            expect(engineRender).toHaveBeenCalledWith('bad', expect.anything())
        })
        expect(container.querySelector('[data-testid="mermaid-error"]')).toBeNull()
        expect(container.querySelector('[data-testid="mermaid-loading"]')).toBeTruthy()
    })

    test('shows the error box once the fence closes with an invalid diagram', async () => {
        const { engine, engineRender } = failOnBad()
        const { container, rerender } = render(MermaidRenderer, {
            props: { text: 'A-->B', closed: false, engine }
        })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeTruthy()
        })

        await rerender({ text: 'bad', closed: false, engine })
        await waitFor(() => {
            expect(engineRender).toHaveBeenCalledWith('bad', expect.anything())
        })

        await rerender({ text: 'bad', closed: true, engine })
        await waitFor(() => {
            const error = container.querySelector('[data-testid="mermaid-error"]')
            expect(error?.textContent).toBe('Diagram error: boom')
        })
    })

    test('shows the error box for an invalid diagram when no closed prop is given', async () => {
        const { engine, engineRender } = failOnBad()
        const { container } = render(MermaidRenderer, { props: { text: 'bad', engine } })
        await waitFor(() => {
            const error = container.querySelector('[data-testid="mermaid-error"]')
            expect(error?.textContent).toBe('Diagram error: boom')
        })
    })
})
