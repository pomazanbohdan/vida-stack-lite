import { test, expect } from 'bun:test';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  linkSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  prepareDevelopmentController,
  inspectDevelopmentController,
  verifyDevelopmentController,
  executeDevelopmentController,
  developmentControllerChildDiagnostic,
} from '../bin/development-controller.mjs';
import { readPortableLock } from '../bin/install.mjs';
const packageRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = process.env.VIDA_CONTROLLER_TEST_TARGET ?? path.resolve(import.meta.dirname, '../../..');
function cleanupOwnedFixture(scratch) {
  const tempRoot = realpathSync(tmpdir()),
    resolved = realpathSync(scratch);
  const relative = path.relative(tempRoot, resolved);
  if (resolved !== scratch || !relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Fixture cleanup requires the exact physical owned temporary path');
  rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

test('controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects', () => {
  const diagnostic = developmentControllerChildDiagnostic(
    {
      status: null,
      signal: 'SIGTERM',
      stdout: 'Bearer private-value\n' + 'x'.repeat(5000),
      stderr: 'token=private-value',
      error: new Error('password=private-value'),
    },
    120001.4,
  );
  expect(diagnostic.signal).toBe('SIGTERM');
  expect(diagnostic.status).toBeNull();
  expect(diagnostic.elapsed_ms).toBe(120001);
  expect(diagnostic.stdout.truncated).toBe(true);
  expect(diagnostic.stdout.text.length).toBe(4096);
  expect(JSON.stringify(diagnostic)).not.toContain('private-value');
  expect(diagnostic.outcome).toBe('child_failure_effects_unknown');
});
test('qualified development controller preserves Source identity and accepts a scoped new target bin through unchanged current code', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-'));
  try {
    const controllerRoot = path.join(scratch, 'controller');
    const prepared = await prepareDevelopmentController({ target: sourceRoot, controllerRoot });
    expect(prepared.status).toBe('prepared');
    expect(readFileSync(path.join(prepared.package_root, 'bun.lock'))).toEqual(readPortableLock(packageRoot));
    expect(prepared.identity.bundle).toBe('packages/agent');
    await expect(
      executeDevelopmentController({ controllerRoot, command: 'run', args: ['--project-root', sourceRoot] }),
    ).rejects.toThrow('qualified');
    const ready = await verifyDevelopmentController({ controllerRoot });
    expect(ready.status).toBe('ready');
    expect(ready.qualification.checks).toContain('actual-source-report');
    expect(ready.qualification.runtime_acceptance).toBe(false);
    console.log(
      JSON.stringify({
        operation: 'controller-prepare-verify',
        prepare_ms: prepared.elapsed_ms,
        verify_ms: ready.elapsed_ms,
      }),
    );
    const warmStarted = performance.now();
    expect((await inspectDevelopmentController({ controllerRoot })).qualification).toEqual(ready.qualification);
    console.log(JSON.stringify({ operation: 'warm-controller-inspect', elapsed_ms: performance.now() - warmStarted }));
    const execStarted = performance.now();
    const invoked = spawnSync(
      ready.engine,
      [
        ...ready.invocation.args,
        'exec',
        '--controller-root',
        controllerRoot,
        '--',
        'vida-agent',
        'scope',
        '--project-root',
        sourceRoot,
        '--repository',
        prepared.identity.repository_id,
        '--project',
        'agent',
        '--path',
        'packages/agent/bin/development-controller.mjs',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(invoked.status, invoked.stderr).toBe(0);
    expect(JSON.parse(invoked.stdout).schema).toBe('ScopedSourceSnapshot/v1');
    console.log(JSON.stringify({ operation: 'warm-controller-exec', elapsed_ms: performance.now() - execStarted }));
    await expect(
      executeDevelopmentController({ controllerRoot, command: 'scope', args: ['--project-root', scratch] }),
    ).rejects.toThrow('exact original target');
    const file = path.join(ready.package_root, 'bin/scope.mjs'),
      before = readFileSync(file);
    writeFileSync(file, Buffer.concat([before, Buffer.from('\n// altered controller\n')]));
    await expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift');
    writeFileSync(file, before);
    const manifestFile = path.join(ready.package_root, 'package.json'),
      manifest = readFileSync(manifestFile);
    writeFileSync(manifestFile, JSON.stringify({ ...JSON.parse(manifest), name: 'wrong-package' }));
    await expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('current vida-agent candidate');
    writeFileSync(manifestFile, manifest);
    const pinFile = path.join(ready.package_root, '.bun-version'),
      pin = readFileSync(pinFile);
    writeFileSync(pinFile, '1.4.1\n');
    await expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow();
    writeFileSync(pinFile, pin);
    const dependency = ready.package_binding.files.find(
      (file) => file.path.startsWith('node_modules/') && file.path.endsWith('package.json'),
    );
    expect(dependency).toBeDefined();
    const depFile = path.join(ready.package_root, dependency.path),
      dep = readFileSync(depFile);
    writeFileSync(depFile, '{}');
    await expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift');
    writeFileSync(depFile, dep);
  } finally {
    cleanupOwnedFixture(scratch);
  }
}, 180000);
test('development controller rejects an active selector and an overlapping or linked target before construction', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-deny-'));
  try {
    mkdirSync(path.join(scratch, '.agent'));
    writeFileSync(path.join(scratch, '.agent/active-runtime-selector.v1.json'), '{}');
    await expect(
      prepareDevelopmentController({ target: scratch, controllerRoot: path.join(scratch, 'controller') }),
    ).rejects.toThrow('active-selector');
    const alias = path.join(scratch, 'source-alias');
    symlinkSync(sourceRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(
      prepareDevelopmentController({ target: alias, controllerRoot: path.join(scratch, 'controller') }),
    ).rejects.toThrow('physical');
    await expect(
      prepareDevelopmentController({
        target: sourceRoot,
        controllerRoot: path.join(sourceRoot, '.tmp/new-controller'),
      }),
    ).rejects.toThrow('outside');
  } finally {
    cleanupOwnedFixture(scratch);
  }
});

test('controller portable lock reader binds only declared regular Source or SDK resources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-controller-lock-'));
  try {
    mkdirSync(path.join(root, 'dist/portable'), { recursive: true });
    const source = path.join(root, 'bun.lock'),
      portable = path.join(root, 'dist/portable/bun.lock');
    const bytes = Buffer.from('TEST SETUP portable lock bytes');
    writeFileSync(portable, bytes);
    expect(readPortableLock(root)).toEqual(bytes);
    writeFileSync(source, 'TEST SETUP selected Source bytes');
    expect(readPortableLock(root)).toEqual(readFileSync(source));
    unlinkSync(source);
    const owner = path.join(root, 'owner');
    writeFileSync(owner, bytes);
    linkSync(owner, source);
    expect(() => readPortableLock(root)).toThrow('regular unlinked');
    expect(readFileSync(owner)).toEqual(bytes);
    unlinkSync(source);
    unlinkSync(portable);
    expect(() => readPortableLock(root)).toThrow('missing its lockfile');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
