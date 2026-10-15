import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { mutationLimits } from './tooling/mutation-limits.ts';

const [{ default: path }, { tmpdir }] = await Promise.all([import('node:path'), import('node:os')]);

const mutationPart = process.env.AGENT_RUNTIME_MUTATION_PART ?? 'main';
const linuxMutation = mutationPart === 'linux';
const windowsMutation = mutationPart === 'windows';
const mutationSource = process.env.AGENT_RUNTIME_MUTATION_SOURCE;
const mutationSources = mutationSource
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const mutationReport = process.env.AGENT_RUNTIME_MUTATION_REPORT;
const reportDirectory =
  process.env.AGENT_RUNTIME_MUTATION_DIRECTORY ?? path.join(tmpdir(), 'agent-runtime-mutation-' + process.pid);
const reportPath = (name: string) => path.join(reportDirectory, name);

const config = {
  mutate: mutationSources?.length
    ? mutationSources
    : linuxMutation || windowsMutation
      ? ['src/config/safe-repository-access.ts']
      : ['src/**/*.ts', '!src/config/safe-repository-access.ts'],
  // Core 10 defaults to its bundled command runner; no external runner plugin is required.
  commandRunner: { command: 'bun tooling/mutation-command-runner.ts' },
  // Retained evidence/sandboxes are not fresh execution inputs.
  ignorePatterns: ['.tmp/**', 'coverage/**'],
  tsconfigFile: '.stryker-no-tsconfig.json',
  coverageAnalysis: 'off',
  plugins: [new URL('./tooling/mutation-map-reporter.ts', import.meta.url).href],
  reporters: ['clear-text', 'json', 'vida-mutant-map'],
  jsonReporter: {
    fileName: reportPath(
      mutationReport ??
        (linuxMutation ? 'mutation-linux.json' : windowsMutation ? 'mutation-windows.json' : 'mutation-main.json'),
    ),
  },
  thresholds:
    linuxMutation || windowsMutation
      ? { high: 0, low: 0, break: null }
      : {
          high: 100,
          low: 100,
          break: null,
        },
  // Slice runs bound mutant execution and recycle only between bounded source slices.
  dryRunTimeoutMinutes: mutationLimits.dryRunEnvelopeMs / 60_000,
  timeoutMS: mutationLimits.mutantOverheadMs,
  timeoutFactor: mutationLimits.mutantTimeoutFactor,
  concurrency: mutationSources?.length ? 4 : linuxMutation || windowsMutation ? 1 : 12,
  maxTestRunnerReuse: mutationSources?.length ? 50 : 10,
  cleanTempDir: true,
  tempDirName: path.join(reportDirectory, 'stryker-tmp'),
  allowConsoleColors: false,
  disableTypeChecks: 'src/**/*.ts',
} satisfies PartialStrykerOptions;

export default config;
