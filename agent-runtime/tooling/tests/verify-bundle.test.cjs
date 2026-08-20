'use strict';
/* global vi */

const fs = require('fs');
const os = require('os');
const path = require('path');
const bundle = require('../../lib/verify-bundle.cjs');

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-bundle-unit-'));
  fs.mkdirSync(path.join(root, 'sub'));
  return root;
}

function manifest(root, value) {
  const file = path.join(root, 'bundle.json');
  fs.writeFileSync(file, value === undefined ? JSON.stringify({ schema: 'VerifyBundle/v1', checks: [{ id: 'one', command: process.execPath, cwd: 'sub', args: ['-e', 'process.exit(0)'], serial: true }] }) : value);
  return file;
}

function blocked(action, pattern) {
  expect(() => action()).toThrow(pattern);
}

describe('VerifyBundle host manifest validator', () => {
  test('normalizes bounded manifest, relative and absolute in-root cwd', () => {
    const root = tempRoot();
    const file = manifest(root);
    const value = bundle.readManifest(file);
    expect(bundle.isNormalizedManifest(value)).toBe(true);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.checks)).toBe(true);
    expect(Object.isFrozen(value.checks[0])).toBe(true);
    expect(Object.isFrozen(value.checks[0].args)).toBe(true);
    expect(value).toMatchObject({ schema: 'VerifyBundle/v1', max_parallel: 2, timeout_ms: 300000 });
    expect(value.checks[0]).toMatchObject({ id: 'one', serial: true, cwd: path.join(root, 'sub') });
    expect(bundle.commandSpec({ id: 'absolute', command: 'node', cwd: path.join(root, 'sub') }, root).cwd).toBe(path.join(root, 'sub'));
    expect(bundle.relativePath('a/b', 'path')).toBe('a/b');
  });

  test('validates optional limits, artifact directory and duplicate ids', () => {
    const root = tempRoot();
    const file = manifest(root, JSON.stringify({ schema: 'VerifyBundle/v1', artifact_dir: 'out', max_parallel: 3, timeout_ms: 1000, checks: [{ id: 'one', command: 'node' }] }));
    expect(bundle.readManifest(file)).toMatchObject({ artifact_dir: path.join(root, 'out'), max_parallel: 3, timeout_ms: 1000 });
    blocked(() => bundle.readManifest(manifest(root, JSON.stringify({ schema: 'VerifyBundle/v1', checks: [{ id: 'x', command: 'node' }, { id: 'x', command: 'node' }] }))), /duplicate id/);
    blocked(() => bundle.readManifest(manifest(root, JSON.stringify({ schema: 'VerifyBundle/v1', max_parallel: 0, checks: [{ id: 'x', command: 'node' }] }))), /max parallel invalid/);
    blocked(() => bundle.readManifest(manifest(root, JSON.stringify({ schema: 'VerifyBundle/v1', timeout_ms: 3600001, checks: [{ id: 'x', command: 'node' }] }))), /check timeout invalid/);
  });

  test('fails closed for malformed files, properties, commands, args and paths', () => {
    const root = tempRoot();
    blocked(() => bundle.normalizeManifest({ schema: 'VerifyBundle/v1', checks: [{ id: 'x', command: 'node' }] }, path.join(root, 'missing-root')), /manifest root invalid/);
    blocked(() => bundle.readManifest(), /manifest required/);
    blocked(() => bundle.readManifest(path.join(root, 'missing.json')), /manifest unavailable/);
    blocked(() => bundle.readManifest(manifest(root, '{')), /manifest invalid/);
    for (const value of [null, {}, { schema: 'Other/v1', checks: [] }, { schema: 'VerifyBundle/v1', checks: [] }, { schema: 'VerifyBundle/v1', checks: [{ id: 'x', command: 'node' }], extra: true }]) blocked(() => bundle.readManifest(manifest(root, JSON.stringify(value))), /manifest invalid/);
    blocked(() => bundle.commandSpec(null, root), /check invalid/);
    blocked(() => bundle.commandSpec({ id: 'x', command: 'node', extra: true }, root), /property invalid/);
    blocked(() => bundle.commandSpec({ command: 'node' }, root), /check id missing/);
    blocked(() => bundle.commandSpec({ id: 'x' }, root), /check command missing/);
    blocked(() => bundle.commandSpec({ id: 'x', command: 'node', args: 'bad' }, root), /args invalid/);
    blocked(() => bundle.commandSpec({ id: 'x', command: 'node', cwd: '..' }, root), /unsafe/);
    blocked(() => bundle.commandSpec({ id: 'x', command: 'node', cwd: path.join(root, '..') }, root), /outside manifest root/);
    blocked(() => bundle.relativePath('', 'path'), /path missing/);
    blocked(() => bundle.relativePath('../escape', 'path'), /unsafe/);
  });

  test('rejects a reparse/symbolic link component before parsing', () => {
    const root = tempRoot();
    const file = manifest(root);
    const original = fs.lstatSync;
    const spy = vi.spyOn(fs, 'lstatSync').mockImplementation(value => {
      const stat = original(value);
      return path.resolve(String(value)) === path.resolve(file) ? { ...stat, isSymbolicLink: () => true } : stat;
    });
    try { blocked(() => bundle.readManifest(file), /reparse point/); } finally { spy.mockRestore(); }
  });
});
