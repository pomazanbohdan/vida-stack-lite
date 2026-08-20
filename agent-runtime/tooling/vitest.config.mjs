import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: ['tooling/tests/**/*.test.cjs'],
    globals: true,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['lib/*.cjs'],
      reporter: ['text', 'json', 'json-summary'],
      thresholds: { lines: 100, functions: 100, branches: 95, statements: 100 }
    }
  }
});
