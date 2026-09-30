import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { maintainedSourceInventory } from './tooling/maintained-source-inventory.mjs';

const sourceRoot = fileURLToPath(new URL('./src/', import.meta.url)).replaceAll('\\', '/');
const maintainedSources = maintainedSourceInventory(fileURLToPath(new URL('./', import.meta.url))).v8CoverageSources;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/*.test.mjs'],
    exclude: ['tests/bun-coverage.test.mjs', 'tests/differential.test.mjs'],
    env: { AGENT_RUNTIME_SKIP_PACKAGE_TEST: '1' },
    sequence: { shuffle: false },
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      all: true,
      include: maintainedSources,
      exclude: [],
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
      reportsDirectory: 'coverage',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      thresholds: {},
    },
  },
  resolve: {
    alias: [
      { find: 'bun:test', replacement: 'vitest' },
      { find: /^\.\.\/dist\/src\/(.+)\.js$/, replacement: sourceRoot + '$1.ts' },
    ],
  },
});
