// Runs ONLY the plan-011 counter harness, with the repo's vitest setup:
//   pnpm vitest run --config .agents/.plans/stream-vs-streamdown/evidence/011/vitest.counters.config.mjs
import base from '../../../../../vite.config.js'

const test = base.test ?? {}

export default {
    ...base,
    test: {
        ...test,
        include: ['.agents/.plans/stream-vs-streamdown/evidence/011/*.counters.test.js'],
        exclude: ['node_modules/**'],
        reporters: ['default'],
        coverage: { enabled: false },
        testTimeout: 600_000,
        hookTimeout: 600_000
    }
}
