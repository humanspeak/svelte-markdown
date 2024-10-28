import { defineConfig } from 'vitest/config'
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite'


export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    coverage: { reporter: 'lcov' }
  },
  build: {
    sourcemap: true,
  },
});
