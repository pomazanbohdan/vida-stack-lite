import path from 'node:path';
import { tmpdir } from 'node:os';

const mutationPart = process.env.AGENT_RUNTIME_MUTATION_PART ?? 'main';
const linuxMutation = mutationPart === 'linux';
const windowsMutation = mutationPart === 'windows';
const bunMutation = mutationPart === 'bun';
const mutationSource = process.env.AGENT_RUNTIME_MUTATION_SOURCE;
const mutationSources = mutationSource
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const mutationTests = process.env.AGENT_RUNTIME_MUTATION_TESTS?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const mutationReport = process.env.AGENT_RUNTIME_MUTATION_REPORT;
const reportDirectory =
  process.env.AGENT_RUNTIME_MUTATION_DIRECTORY ?? path.join(tmpdir(), 'agent-runtime-mutation-' + process.pid);
const reportPath = (name) => path.join(reportDirectory, name);
export default {
  mutate: mutationSources?.length
    ? mutationSources
    : linuxMutation || windowsMutation
      ? ['src/config/safe-repository-access.ts']
      : ['src/**/*.ts', '!src/config/safe-repository-access.ts'],
  testRunner: bunMutation ? 'command' : 'vitest',
  ...(bunMutation
    ? { commandRunner: { command: `bun test ${mutationTests?.join(' ') ?? ''} --timeout 15000` } }
    : { vitest: { configFile: 'vitest.config.mjs', related: false } }),
  tsconfigFile: '.stryker-no-tsconfig.json',
  coverageAnalysis: bunMutation ? 'off' : 'perTest',
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
  timeoutMS: bunMutation ? 60_000 : mutationSources?.length ? 3_000 : 60_000,
  timeoutFactor: mutationSources?.length ? 1.5 : 2,
  concurrency: mutationSources?.length ? 4 : linuxMutation || windowsMutation ? 1 : 12,
  maxTestRunnerReuse: mutationSources?.length ? 50 : 10,
  ...(!bunMutation && {
    testFiles: linuxMutation
      ? ['tests/safe-repository-linux-simulation.test.mjs']
      : windowsMutation
        ? ['tests/safe-repository-completeness.test.mjs']
        : (mutationTests ?? [
            'tests/coverage-completeness.test.mjs',
            'tests/governance-completeness.test.mjs',
            'tests/project-context-boundary.test.mjs',
            'tests/zombies.test.mjs',
            'tests/property.test.mjs',
            'tests/bun-coverage.test.mjs',
            'tests/edictum-workflow-completeness.test.mjs',
            'tests/fuzz.test.mjs',
            'tests/runtime-config-yaml.test.mjs',
            'tests/smoke.test.mjs',
            'tests/safe-repository-completeness.test.mjs',
            'tests/host-capability-boundary.test.mjs',
            'tests/envelopes-boundary.test.mjs',
          ]),
  }),
  cleanTempDir: true,
  tempDirName: path.join(reportDirectory, 'stryker-tmp'),
  allowConsoleColors: false,
  disableTypeChecks: 'src/**/*.ts',
};
