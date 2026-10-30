import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { getReleaseSourceRoots } from '../bin/local-release-artifacts.ts';

test('the release source inventory has the expected ordered roots', () => {
  assert.deepEqual(getReleaseSourceRoots(), [
    { path: 'package.json', kind: 'file' },
    { path: 'agent-runtime.config.v1.yaml', kind: 'file' },
    { path: 'AGENT.sidecar.md', kind: 'file' },
    { path: 'packages/agent', kind: 'directory' },
    { path: 'packages/plugin', kind: 'directory' },
    { path: 'tests/agent', kind: 'directory' },
    { path: 'tooling/agent', kind: 'directory' },
    { path: '.githooks', kind: 'directory' },
    { path: '.github/workflows/agent-native-delivery.yml', kind: 'file' },
  ]);
});

test('a caller cannot change the release source inventory', () => {
  const original = getReleaseSourceRoots();
  const changed = getReleaseSourceRoots();
  const first = changed[0];
  assert.ok(first);
  Reflect.set(first, 'path', 'foreign');
  changed.pop();
  assert.deepEqual(getReleaseSourceRoots(), original);
});
