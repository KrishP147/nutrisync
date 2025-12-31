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
    // Increase timeout when coverage is enabled (slower)
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    // Use threads pool (default) - works better with async operations
    // The deprecated poolOptions has been removed per Vitest 4 migration
    watch: false,
    reporter: ['verbose'],
    // Limit max concurrency in CI to prevent resource issues
    maxConcurrency: 5,
    // Ensure tests exit properly in CI
    bail: 0, // Don't bail on first failure, run all tests
    // Force sequential execution in CI to avoid race conditions
    sequence: {
      shuffle: false,
      concurrent: true,
    },
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
