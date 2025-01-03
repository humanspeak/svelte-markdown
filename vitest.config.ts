import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            exclude: [
                'node_modules/**',
                'dist/**',
                'docs/**',
                'src/routes/**',
                'coverage/**',
                'test/**',
                '**/*.test.*',
                '**/*.spec.*'
            ]
        }
    }
})
