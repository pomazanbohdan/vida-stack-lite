import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Diagnostic-only: evidence truth, lifecycle gates and deterministic checkpoint
// I/O faults. The release command continues to use the complete suite.
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: {
    include: [
      'tooling/tests/fault-seams.test.cjs',
      'tooling/tests/runtime-critical-profile.test.cjs',
      'tooling/tests/runtime-architect-escalation.test.cjs',
      'tooling/tests/runtime-clarification-verbs.test.cjs',
      'tooling/tests/runtime-lifecycle-matrix.test.cjs',
      'tooling/tests/runtime-mutation-invariants.test.cjs',
      'tooling/tests/runtime-replay-matrix.test.cjs',
      'tooling/tests/runtime-profile-attestation.test.cjs',
      'tooling/tests/runtime-scenario-matrix.test.cjs'
    ],
    globals: true,
    testTimeout: 30_000
  }
});
