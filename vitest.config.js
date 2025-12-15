import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['build/__tests__/setup.js'],
    include: ['build/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['build/*.js'],
      exclude: ['build/__tests__/**', 'build/*.min.js']
    },
    // Property-based tests should run at least 100 iterations
    testTimeout: 30000
  }
});
