import { availableParallelism } from 'node:os';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/** Isolated full manual mutation gate for all maintained runtime libraries. */
// Six isolated workers are the stable default Windows-host setting. A bounded
// explicit override is available for a deliberately larger external run; it
// never changes targets, thresholds or partition ownership.
const defaultMutationConcurrency = Math.max(1, Math.min(6, availableParallelism()));
const requestedMutationConcurrency = process.env.AGENT_RUNTIME_MUTATION_CONCURRENCY;
const mutationConcurrency = requestedMutationConcurrency === undefined
  ? defaultMutationConcurrency
  : Number(requestedMutationConcurrency);
if (!Number.isSafeInteger(mutationConcurrency) || mutationConcurrency < 1 || mutationConcurrency > 12) {
  throw new Error('AGENT_RUNTIME_MUTATION_CONCURRENCY must be an integer between 1 and 12');
}
const defaultMutationTimeoutMs = 5000;
const requestedMutationTimeoutMs = process.env.AGENT_RUNTIME_MUTATION_TIMEOUT_MS;
const mutationTimeoutMs = requestedMutationTimeoutMs === undefined
  ? defaultMutationTimeoutMs
  : Number(requestedMutationTimeoutMs);
if (!Number.isSafeInteger(mutationTimeoutMs) || mutationTimeoutMs < defaultMutationTimeoutMs || mutationTimeoutMs > 60000) {
  throw new Error(`AGENT_RUNTIME_MUTATION_TIMEOUT_MS must be an integer between ${defaultMutationTimeoutMs} and 60000`);
}
const mutationOutput = process.env.AGENT_RUNTIME_MUTATION_OUTPUT || 'summary';
if (!['summary', 'full'].includes(mutationOutput)) throw new Error('AGENT_RUNTIME_MUTATION_OUTPUT must be summary or full');
const runtimeRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(runtimeRoot, '..');
const requestedReport = process.env.AGENT_RUNTIME_MUTATION_REPORT;
const mutationReport = requestedReport ? path.resolve(repositoryRoot, requestedReport) : path.join(repositoryRoot, '.planning', 'agent-flow', 'test-output', 'mutation', 'mutation.json');
if (mutationReport === runtimeRoot || mutationReport.startsWith(`${runtimeRoot}${path.sep}`)) throw new Error('mutation report must be projected outside agent-runtime');
mkdirSync(path.dirname(mutationReport), { recursive: true });
const vitestConfig = process.env.AGENT_RUNTIME_MUTATION_VITEST_CONFIG || 'tooling/vitest.config.mjs';
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: { configFile: vitestConfig, related: false },
  mutate: ['lib/runtime.cjs', 'lib/backlog-adapter.cjs', 'lib/legacy-import.cjs'],
  ignorePatterns: [
    '.stryker-tmp/**', 'coverage/**', 'node_modules/**',
    'reports/mutation/*.json', 'reports/mutation/*.log',
    'tooling/node_modules/**'
  ],
  // Runtime is CJS; avoid Stryker's TypeScript-7-incompatible tsconfig rewrite.
  tsconfigFile: 'stryker-no-tsconfig.json',
  coverageAnalysis: process.env.AGENT_RUNTIME_MUTATION_COVERAGE || 'perTest',
  // The orchestrator keeps the default output compact; full clear-text is an
  // explicit diagnostic mode and never changes mutation semantics.
  reporters: mutationOutput === 'full' ? ['clear-text', 'json'] : ['json'],
  jsonReporter: { fileName: mutationReport },
  thresholds: { high: 100, low: 100, break: 100 },
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
  // Temp repositories and lock paths are test-local; bounded parallelism keeps
  // the full manual gate practical without sharing mutable fixtures.
  concurrency: mutationConcurrency,
  // Stryker already partitions mutants across six processes. Keep the normal
  // five-second infinite-loop allowance so a timed-out mutant cannot occupy a
  // worker for an additional thirty seconds before the worker is recycled.
  timeoutMS: mutationTimeoutMs
};
