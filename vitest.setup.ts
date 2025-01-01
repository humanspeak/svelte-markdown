import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock requestAnimationFrame and related timing functions
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

// Reset mocks between tests
beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
})
