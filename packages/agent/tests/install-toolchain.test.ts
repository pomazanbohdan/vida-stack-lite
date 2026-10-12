import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { install } from '../bin/install.ts';
import { readPin } from '../bin/bun.ts';

const temporaryRoots = new Set<string>();
afterEach(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots.clear();
});

function fixture(): { root: string; pin: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-bun-toolchain-'));
  temporaryRoots.add(root);
  const pin = readPin();
  mkdirSync(path.join(root, 'bin'));
  writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ packageManager: `bun@${pin}`, engines: { bun: pin }, dependencies: {} }),
  );
  writeFileSync(path.join(root, 'bun.lock'), '{}\n');
  writeFileSync(path.join(root, 'bunfig.toml'), '');
  for (const file of ['bin/bun.ts', 'bin/init.ts', 'bin/install.ts']) writeFileSync(path.join(root, file), '');
  return { root, pin };
}

test('default Bun installer check qualifies the absolute pinned host without Node or npm metadata', () => {
  const { root, pin } = fixture();
  const result = install(['--check'], {
    root,
    env: { PATH: '' },
    runBun: () => assert.fail('check must not resolve or initialize dependencies'),
  });
  assert.equal(process.versions.bun, pin);
  assert.equal(result.bun, pin);
  assert.equal(result.bun_pin, pin);
  assert.equal(result.runtime, 'bun');
  assert.equal(result.dependencies, 'not_checked');
  assert.equal(result.bun_executable, process.execPath);
  assert.equal(path.isAbsolute(String(result.bun_executable)), true);
});

test('default Bun installer resolves a declared local dependency with its pinned executable and no Node PATH', () => {
  const { root } = fixture();
  const manifestFile = path.join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { dependencies: Record<string, string> };
  manifest.dependencies = { 'fixture-dependency': '1.0.0' };
  writeFileSync(manifestFile, JSON.stringify(manifest));
  const dependency = path.join(root, 'node_modules/fixture-dependency');
  mkdirSync(dependency, { recursive: true });
  writeFileSync(
    path.join(dependency, 'package.json'),
    JSON.stringify({ name: 'fixture-dependency', version: '1.0.0', exports: './index.ts' }),
  );
  writeFileSync(path.join(dependency, 'index.ts'), 'export const fixture = true;\n');
  const result = install([], { root, env: { PATH: '' } });
  assert.equal(result.status, 'bun_dependencies_valid');
  assert.equal(result.initialization, 'not_requested');
});

test('missing declared dependency fails without installation or initialization effects', () => {
  const { root } = fixture();
  const manifestFile = path.join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { dependencies: Record<string, string> };
  manifest.dependencies = { 'vida-nonexistent-fixture-dependency': '1.0.0' };
  writeFileSync(manifestFile, JSON.stringify(manifest));
  const before = readdirSync(root).sort();
  const lock = readFileSync(path.join(root, 'bun.lock'));
  assert.throws(() => install([], { root, env: { PATH: '' } }), /Bun dependency entrypoint check|Pinned Bun/u);
  assert.deepEqual(readdirSync(root).sort(), before);
  assert.deepEqual(readFileSync(path.join(root, 'bun.lock')), lock);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
});
