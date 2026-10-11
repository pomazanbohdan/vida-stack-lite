import path from 'node:path';
import { tmpdir } from 'node:os';

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
/** @param {string} name */
const reportPath = (name) => path.join(reportDirectory, name);
export default {
  mutate: mutationSources?.length
    ? mutationSources
    : linuxMutation || windowsMutation
      ? ['src/config/safe-repository-access.ts']
      : ['src/**/*.ts', '!src/config/safe-repository-access.ts'],
  // Core 10 defaults to its bundled command runner; no external runner plugin is required.
  commandRunner: { command: 'bun tooling/mutation-command-runner.mjs' },
  tsconfigFile: '.stryker-no-tsconfig.json',
  coverageAnalysis: 'off',
  reporters: ['clear-text', 'json'],
  jsonReporter: {
    fileName: reportPath(
      mutationReport ??
        (linuxMutation ? 'mutation-linux.json' : windowsMutation ? 'mutation-windows.json' : 'mutation-main.json'),
    ),
  },
  thresholds:
    linuxMutation || windowsMutation
      ? { high: 0, low: 0, break: 0 }
      : {
          high: 100,
          low: 100,
          break: 100,
        },
  // Slice runs bound mutant execution and recycle only between bounded source slices.
  timeoutMS: 60_000,
  timeoutFactor: mutationSources?.length ? 1.5 : 2,
  concurrency: mutationSources?.length ? 4 : linuxMutation || windowsMutation ? 1 : 12,
  maxTestRunnerReuse: mutationSources?.length ? 50 : 10,
  cleanTempDir: true,
  tempDirName: path.join(reportDirectory, 'stryker-tmp'),
  allowConsoleColors: false,
  disableTypeChecks: 'src/**/*.ts',
};
