import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import 'vitest'

// jest-dom 7 still augments the pre-Vitest-5 Assertion interface.
// Keep its DOM matchers typed until it adopts Vitest 5's Matchers interface.
declare module 'vitest' {
    // trunk-ignore(eslint/@typescript-eslint/no-empty-object-type): Declaration merging requires an interface.
    interface Matchers<
        R extends void | Promise<void> = void | Promise<void>,
        T = unknown
    > extends TestingLibraryMatchers<T, R> {}
}
