import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['plotly.js-dist-min'],
  },
  resolve: {
    alias: {
      'plotly.js/dist/plotly': 'plotly.js-dist-min'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Use forks pool for better CI compatibility (Vitest 4 migration)
    pool: process.env.CI ? 'forks' : 'threads',
    // Migrated from poolOptions: singleFork is now maxWorkers: 1, isolate: false
    ...(process.env.CI ? {
      maxWorkers: 1,
      isolate: false,
    } : {}),
    watch: false,
    reporter: ['verbose'],
    // Limit max concurrency in CI
    maxConcurrency: process.env.CI ? 1 : 5,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
      ]
    }
  }
})
