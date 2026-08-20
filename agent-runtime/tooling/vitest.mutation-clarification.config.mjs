import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Diagnostic-only profile for bounded clarification mutation ranges. The
// release mutation command continues to use vitest.config.mjs and the full
// suite; this profile only shortens survivor discovery while editing a guard.
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: [
      'tooling/tests/runtime-clarification-verbs.test.cjs',
      'tooling/tests/runtime-clarification-contract.test.cjs',
      'tooling/tests/runtime-scenario-matrix.test.cjs'
    ],
    globals: true,
    testTimeout: 30_000
  }
});
