'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const runtime = require('../../lib/runtime.cjs');

test('generated test directories are excluded after the reparse check', () => {
  expect([...runtime.derivedDirectoryNames].sort()).toEqual(
    ['.stryker-tmp', '.vitest', 'coverage', 'node_modules']
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-derived-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'derived@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'derived'], { cwd: root });
  fs.mkdirSync(path.join(root, 'runtime'));
  fs.writeFileSync(path.join(root, 'runtime', 'source.cjs'), 'module.exports = 1;\n');
  for (const name of runtime.derivedDirectoryNames) {
    fs.mkdirSync(path.join(root, 'runtime', name));
    fs.writeFileSync(path.join(root, 'runtime', name, 'generated.txt'), 'before');
  }
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'baseline'], { cwd: root });
  const scope = { fingerprint_paths: ['runtime/**'] };
  const before = runtime.implementationFingerprint(scope, root);
  const projected = path.join(root, '.planning', 'agent-flow', 'test-output', 'mutation');
  fs.mkdirSync(projected, { recursive: true });
  fs.writeFileSync(path.join(projected, 'mutation.json'), '{"run":1}');
  expect(runtime.implementationFingerprint(scope, root)).toBe(before);
  fs.writeFileSync(path.join(projected, 'mutation.json'), '{"run":2}');
  expect(runtime.implementationFingerprint(scope, root)).toBe(before);
  for (const name of runtime.derivedDirectoryNames) {
    fs.writeFileSync(path.join(root, 'runtime', name, 'generated.txt'), 'after');
  }
  expect(runtime.implementationFingerprint(scope, root)).toBe(before);
  fs.mkdirSync(path.join(root, 'runtime', 'reports'));
  fs.writeFileSync(path.join(root, 'runtime', 'reports', 'source.txt'), 'source-report-v1');
  const withSourceReport = runtime.implementationFingerprint(scope, root);
  expect(withSourceReport).not.toBe(before);
  fs.writeFileSync(path.join(root, 'runtime', 'reports', 'source.txt'), 'source-report-v2');
  expect(runtime.implementationFingerprint(scope, root)).not.toBe(withSourceReport);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-source-reports-'));
  fs.writeFileSync(path.join(outside, 'source.txt'), 'outside');
  fs.rmSync(path.join(root, 'runtime', 'reports'), { recursive: true });
  fs.symlinkSync(outside, path.join(root, 'runtime', 'reports'), /** @type {'junction'} */ ('junction'));
  expect(() => runtime.implementationFingerprint(scope, root)).toThrow(/reparse point in scope/);
  fs.rmdirSync(path.join(root, 'runtime', 'reports'));
  fs.writeFileSync(path.join(root, 'runtime', 'source.cjs'), 'module.exports = 2;\n');
  expect(runtime.implementationFingerprint(scope, root)).not.toBe(before);
});
