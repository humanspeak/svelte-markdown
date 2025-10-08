import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

// Mock requestAnimationFrame and related timing functions
global.requestAnimationFrame = vi.fn().mockImplementation((cb: FrameRequestCallback): number => {
    const timeoutId = setTimeout(cb, 0)
    return Number(timeoutId)
})
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
    /* trunk-ignore(eslint/no-unused-vars) */
    constructor(public callback: IntersectionObserverCallback) {}
    observe(target: Element) {
        // Immediately trigger callback as if element is intersecting
        this.callback(
            [
                {
                    isIntersecting: true,
                    target,
                    intersectionRatio: 1,
                    boundingClientRect: {} as DOMRectReadOnly,
                    intersectionRect: {} as DOMRectReadOnly,
                    rootBounds: null,
                    time: Date.now()
                }
            ] as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver
        )
    }
    disconnect() {}
    unobserve() {}
    takeRecords(): IntersectionObserverEntry[] {
        return []
    }
    get root() {
        return null
    }
    get rootMargin() {
        return '0px'
    }
    get thresholds() {
        return [0]
    }
} as unknown as typeof IntersectionObserver

// Reset mocks between tests
beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
})
