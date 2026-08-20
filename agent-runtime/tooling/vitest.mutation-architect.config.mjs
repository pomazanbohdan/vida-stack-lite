import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Diagnostic-only profile for bounded architect/review mutation ranges. The
// default release command still uses the complete Vitest suite.
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: [
      'tooling/tests/runtime-architect-escalation.test.cjs',
      'tooling/tests/runtime-profile-attestation.test.cjs',
      'tooling/tests/runtime-replay-matrix.test.cjs',
      'tooling/tests/runtime-scenario-matrix.test.cjs'
    ],
    globals: true,
    testTimeout: 30_000
  }
});
