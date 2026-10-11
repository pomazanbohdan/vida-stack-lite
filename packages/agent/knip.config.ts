import type { KnipConfig } from 'knip';

const codeFiles = '**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}';
const tests = ['tests/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'];

const config = {
  workspaces: {
    '.': {
      // Child-process entrypoints and the source template have concrete consumers.
      entry: [
        'tooling/agent/controllers/forward-update-prepare.mjs',
        'tooling/agent/controllers/forward-update-finalize.mjs',
        'tooling/agent/controllers/forward-documentation-phase.mjs',
        'tooling/agent/controllers/forward-lifecycle-clear.mjs',
        // Loaded by the strict native test compiler as the adapter's type companion.
        'tooling/agent/controllers/forward-payload-runtime.d.mts',
        'tooling/agent/combined-public-steps.mjs',
        ...tests,
      ],
      project: ['tooling/agent/' + codeFiles, 'tests/agent/' + codeFiles],
    },
    'packages/agent': {
      // POSIX system utility for bounded, owned FIFO fixtures; not an npm dependency.
      // This exact binary exception does not suppress files, exports or dependencies.
      ignoreBinaries: ['mkfifo'],
      entry: [
        'bin/scope.ts',
        'bin/development-controller.mjs',
        // Explicit child/preload paths and compiler/declaration inputs.
        'tooling/knip-precommit.ts',
        'tooling/git-quality-hooks.ts',
        'tooling/development-controller-qualification.mjs',
        'tooling/bun-coverage-preload.ts',
        'tooling/mutation-command-runner.mjs',
        'tooling/mutation-test-preload.ts',
        // Fault injection is loaded by test children through explicit --preload paths.
        'tests/helpers/clean-stat-fault-preload.ts',
        'tests/helpers/project-upgrade-stop-preload.ts',
        // The preload reads this template to create per-test assertion adapters.
        'tooling/mutation-test-adapter.ts',
        // Declaration inputs consumed by the compiler and included in the package.
        'tooling/bun-coverage-evidence.d.mts',
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
