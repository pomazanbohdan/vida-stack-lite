import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Diagnostic-only checkpoint/schema profile. Keep dense lifecycle, delivery and
// reviewer matrices out of structural checkpoint mutation slices; the release
// mutation command still runs the complete suite.
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: [
      'tooling/tests/runtime-critical-profile.test.cjs',
      'tooling/tests/runtime-mutation-invariants.test.cjs',
      'tooling/tests/schema-parity.test.cjs'
    ],
    globals: true,
    testTimeout: 30_000
  }
});
