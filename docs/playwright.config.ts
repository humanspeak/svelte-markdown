import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
    testDir: './tests',
    outputDir: '../test-results/docs',
    reporter: [['junit', { outputFile: 'test-results/docs/junit-playwright.xml' }]],
    retries: process.env.CI ? 2 : 0,
    timeout: 60000,
    webServer: {
        command:
            'pnpm --filter docs build && pnpm --filter docs preview --host 127.0.0.1 --port 4174 --strictPort',
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        url: 'http://127.0.0.1:4174',
        timeout: 180000,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe'
    },
    use: {
        baseURL: 'http://127.0.0.1:4174',
        trace: 'on-first-retry'
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
