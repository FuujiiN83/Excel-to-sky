import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest baseline (#234). Wired so a `test/` directory of `*.test.ts` /
 * `*.test.tsx` files is picked up out of the box. The project deliberately
 * ships with zero tests today — the engine is verified manually via the dev
 * workbench — but the config is here so adding the first test is a one-line
 * affair.
 *
 * Common patterns:
 *   - Stats helpers: src/lib/insights/heuristics/*.test.ts
 *   - Components: src/components/*.test.tsx (jsdom environment)
 *
 * Run: `npm run test`.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
})
