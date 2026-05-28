import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer (#182). Writes dist/stats.html with the gzip-weighted
    // treemap of every chunk. Enabled on every build so the report tracks the
    // last shipped bundle without needing a separate npm script.
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      // Don't open the report automatically — CI runs would hang.
      open: false,
    }),
  ],
  server: {
    // Vite already supports SPA fallback on dev. For preview/production, nginx handles it.
  },
  build: {
    // Sourcemap audit (#237). Hidden source maps land in dist/assets/*.js.map
    // so the bundle stays auditable in error-tracking tools (Sentry, etc.)
    // without leaking the //# sourceMappingURL comment to end-user bundles.
    // Switch to true if you want the comment back (browser devtools become
    // mappable out of the box).
    sourcemap: 'hidden',
  },
})
