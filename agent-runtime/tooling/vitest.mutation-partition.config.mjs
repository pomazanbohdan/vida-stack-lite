import { defineConfig } from 'vitest/config';
import path from 'node:path';

const tests = String(process.env.AGENT_RUNTIME_MUTATION_TESTS || '').split(';').filter(Boolean);
if (!tests.length) throw new Error('AGENT_RUNTIME_MUTATION_TESTS is required');
const defaultMutationTestTimeoutMs = 30_000;
const requestedMutationTestTimeoutMs = process.env.AGENT_RUNTIME_MUTATION_TEST_TIMEOUT_MS;
const mutationTestTimeoutMs = requestedMutationTestTimeoutMs === undefined
  ? defaultMutationTestTimeoutMs
  : Number(requestedMutationTestTimeoutMs);
if (!Number.isSafeInteger(mutationTestTimeoutMs) || mutationTestTimeoutMs < defaultMutationTestTimeoutMs || mutationTestTimeoutMs > 3_600_000) {
  throw new Error('AGENT_RUNTIME_MUTATION_TEST_TIMEOUT_MS must be an integer between 30000 and 3600000');
}

export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  test: { include: tests, globals: true, testTimeout: mutationTestTimeoutMs }
});
