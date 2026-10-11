import { describe, expect, test } from 'bun:test';
import { rejectStagedJavaScriptSources } from '../tooling/knip-precommit.js';

describe('staged TS-only pre-commit gate', () => {
  test('accepts native TypeScript paths and exact generated output boundaries', () => {
    const stagedFiles = [
      'packages/agent/src/current.ts',
      'packages/agent/tooling/current.mts',
      'packages/agent/tests/current.cts',
      'packages/agent/knip.config.tsx',
      'packages/plugin/src/current.ts',
      'tests/agent/current.ts',
      'tooling/agent/current.ts',
      '.githooks/current.ts',
      'packages/agent/dist/generated.js',
      'packages/agent/node_modules/tool/generated.mjs',
      'packages/agent/coverage/report.cjs',
      'packages/plugin/dist/generated.jsx',
      'packages/plugin/node_modules/tool/generated.js',
      'packages/plugin/coverage/report.mjs',
      'packages/agent/src/dist/handwritten.ts',
      'packages/agent/src/dist/handwritten.js.map',
      'README.js',
      'packages/agentish/src/outside.js',
    ];

    expect(() => rejectStagedJavaScriptSources(stagedFiles)).not.toThrow();
  });

  test('rejects every maintained JavaScript extension in stable path order', () => {
    const stagedFiles = [
      'tooling/agent/legacy.jsx',
      '.githooks/legacy.js',
      'tests/agent/legacy.cjs',
      'packages/plugin/src/legacy.mjs',
      'packages/agent/src/legacy.js',
      'packages/agent/src/dist/handwritten.js',
    ];

    expect(() => rejectStagedJavaScriptSources(stagedFiles)).toThrow(
      [
        'Staged TS-only source gate failed:',
        '.githooks/legacy.js\t.js',
        'packages/agent/src/dist/handwritten.js\t.js',
        'packages/agent/src/legacy.js\t.js',
        'packages/plugin/src/legacy.mjs\t.mjs',
        'tests/agent/legacy.cjs\t.cjs',
        'tooling/agent/legacy.jsx\t.jsx',
      ].join('\n'),
    );
  });
});
