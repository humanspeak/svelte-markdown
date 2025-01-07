import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    webServer: {
        command: 'npm run build && npm run preview',
        port: 4173,
        reuseExistingServer: !process.env.CI
    },
    use: {
        baseURL: 'http://localhost:4173'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        }
    ]
})
