import type { KnipConfig } from 'knip';

const codeFiles = '**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}';
const tests = ['tests/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'];

const config = {
  workspaces: {
    '.': {
      // Child-process entrypoints and the source template have concrete consumers.
      entry: [
        // Invoked by the repository-owned Cloud Environment setup template.
        'tooling/agent/cloud-tooling-setup.ts',
        'tooling/agent/cloud-tooling-check.ts',
        'tooling/agent/cloud-pstack-setup.ts',
        'tooling/agent/check-documentation.ts',
        // Package coverage scripts select this child through the pinned launcher.
        'tooling/agent/run-coverage.ts',
        'tooling/agent/controllers/forward-update-prepare.ts',
        'tooling/agent/controllers/forward-update-finalize.ts',
        'tooling/agent/controllers/forward-documentation-phase.ts',
        'tooling/agent/controllers/forward-lifecycle-clear.ts',
        'tooling/agent/combined-public-steps.ts',
        ...tests,
      ],
      project: ['tooling/agent/' + codeFiles, 'tests/agent/' + codeFiles],
    },
    'packages/agent': {
      // POSIX FIFO utility and Bun's built-in check subcommand are not npm binaries.
      // These exact exceptions do not suppress files, exports or dependencies.
      ignoreBinaries: ['mkfifo', 'check'],
      entry: [
        'bin/scope.ts',
        'bin/development-controller.ts',
        // Explicit child/preload paths and compiler/declaration inputs.
        'tooling/git-quality-hooks.ts',
        'tooling/development-controller-qualification.ts',
        'tooling/bun-coverage-preload.ts',
        'tooling/mutation-command-runner.ts',
        'tooling/mutation-test-preload.ts',
        // Loaded by Stryker's public reporter plugin API from the config URL.
        'tooling/mutation-map-reporter.ts',
        // Fault injection is loaded by test children through explicit --preload paths.
        'tests/helpers/clean-stat-fault-preload.ts',
        'tests/helpers/project-upgrade-stop-preload.ts',
        // Lifecycle fault children import this fixture API inside generated Bun tests.
        'tests/helpers/runtime-config-rebind-fixture.ts',
        // The preload reads this template to create per-test assertion adapters.
        'tooling/mutation-test-adapter.ts',
        // Declaration inputs consumed by the compiler and included in the package.
        'src/config/index.ts',
        // release-local loads this custody API through its createRequire boundary.
        'src/config/service-operation-custody.ts',
        ...tests,
      ],
      project: [codeFiles],
    },
    'packages/plugin': {
      entry: [],
      project: [codeFiles],
    },
  },
} satisfies KnipConfig;

export default config;
