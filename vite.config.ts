import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit(), svelteTesting()],
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['vitest.setup.ts'],
        coverage: { reporter: 'lcov' },
        exclude: [...configDefaults.exclude, 'docs/**/*']
    },
    build: {
        sourcemap: true
    }
})
