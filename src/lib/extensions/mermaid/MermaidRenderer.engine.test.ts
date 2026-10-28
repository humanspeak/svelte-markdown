/**
 * Engine-agnostic renderer coverage. Pins the resolution order (prop → context →
 * singleton → built-in mermaid.js), async/stale-result handling, error display,
 * and theme inputs, using stub engines so it runs without mermaid.js.
 */

import '@testing-library/jest-dom'
import { render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import MermaidContextHost from '../../test/MermaidContextHost.svelte'
import { setMermaidEngine } from './mermaidContext.js'
import type { MermaidEngine, MermaidRenderContext } from './mermaidEngine.js'
import MermaidRenderer from './MermaidRenderer.svelte'

const mockRender = vi.fn()
const mockInitialize = vi.fn()

vi.mock('mermaid', () => ({
    default: {
        render: mockRender,
        initialize: mockInitialize
    }
}))

/** Synchronous stub engine that echoes its input, tagged with a label. */
const syncStub = (label: string): MermaidEngine & { calls: string[] } => {
    const calls: string[] = []
    return {
        calls,
        render(text: string) {
            calls.push(text)
            return { svg: `<svg data-engine="${label}">${text}</svg>` }
        }
    }
}

const deferred = <T>() => {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

beforeEach(() => {
    // The global setup uses fake timers; waitFor and the async effect need real ones.
    vi.useRealTimers()
})

afterEach(() => {
    setMermaidEngine(undefined)
    document.documentElement.className = ''
    mockRender.mockReset()
    mockInitialize.mockReset()
})

describe('MermaidRenderer engine resolution', () => {
    test('uses the explicit engine prop over context and singleton', async () => {
        setMermaidEngine(syncStub('singleton'))
        const { container } = render(MermaidContextHost, {
            props: {
                contextEngine: syncStub('context'),
                propEngine: syncStub('prop'),
                text: 'A-->B'
            }
        })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                'data-engine="prop"'
            )
        })
    })

    test('uses context over the singleton', async () => {
        setMermaidEngine(syncStub('singleton'))
        const { container } = render(MermaidContextHost, {
            props: { contextEngine: syncStub('context'), text: 'A-->B' }
        })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                'data-engine="context"'
            )
        })
    })

    test('falls back to the singleton when there is no prop and no context', async () => {
        setMermaidEngine(syncStub('singleton'))
        const { container } = render(MermaidRenderer, { props: { text: 'A-->B' } })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                'data-engine="singleton"'
            )
        })
    })

    test('a synchronous engine renders without loading mermaid.js', async () => {
        const { container } = render(MermaidRenderer, {
            props: { text: 'A-->B', engine: syncStub('sync') }
        })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')).toBeTruthy()
        })
        expect(mockRender).not.toHaveBeenCalled()
        expect(mockInitialize).not.toHaveBeenCalled()
    })

    test('renders the SVG from an asynchronous engine once it resolves', async () => {
        const engine: MermaidEngine = {
            render: () => Promise.resolve({ svg: '<svg data-engine="async"></svg>' })
        }
        const { container } = render(MermaidRenderer, { props: { text: 'A-->B', engine } })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                'data-engine="async"'
            )
        })
    })

    test('discards a stale async result when the text changes mid-flight', async () => {
        const first = deferred<{ svg: string }>()
        const second = deferred<{ svg: string }>()
        const pending = [first, second]
        const engine: MermaidEngine = {
            render: () => pending.shift()!.promise
        }

        const { container, rerender } = render(MermaidRenderer, {
            props: { text: 'A', engine }
        })

        await rerender({ text: 'B' })
        second.resolve({ svg: '<svg>B</svg>' })
        await waitFor(() => {
            expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
                '<svg>B</svg>'
            )
        })

        first.resolve({ svg: '<svg>A</svg>' })
        await Promise.resolve()
        expect(container.querySelector('[data-testid="mermaid-diagram"]')?.innerHTML).toContain(
            '<svg>B</svg>'
        )
        expect(container.innerHTML).not.toContain('<svg>A</svg>')
    })

    test('renders the error state when the engine returns an error result', async () => {
        const engine: MermaidEngine = { render: () => ({ error: 'boom' }) }
        const { container } = render(MermaidRenderer, { props: { text: 'x', engine } })
        await waitFor(() => {
            const error = container.querySelector('[data-testid="mermaid-error"]')
            expect(error?.textContent).toBe('Diagram error: boom')
        })
    })

    test('passes theme inputs to the engine and re-renders when the html class changes', async () => {
        document.documentElement.classList.add('dark')
        const seen: MermaidRenderContext[] = []
        const engine: MermaidEngine = {
            render: (_text, context) => {
                seen.push(context)
                return { svg: '<svg>x</svg>' }
            }
        }

        render(MermaidRenderer, { props: { text: 'A-->B', engine } })

        await waitFor(() => {
            expect(seen.at(-1)).toEqual({ dark: true, lightTheme: 'default', darkTheme: 'dark' })
        })

        document.documentElement.classList.remove('dark')

        await waitFor(() => {
            expect(seen.at(-1)).toEqual({ dark: false, lightTheme: 'default', darkTheme: 'dark' })
        })
    })
})
