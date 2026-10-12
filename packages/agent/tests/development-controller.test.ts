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
} from '../bin/development-controller.ts';
import { readPortableLock } from '../bin/install.ts';

const packageRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = process.env.VIDA_CONTROLLER_TEST_TARGET ?? path.resolve(import.meta.dirname, '../../..');

function cleanupOwnedFixture(scratch: string): void {
  const tempRoot = realpathSync(tmpdir());
  const resolved = realpathSync(scratch);
  const relative = path.relative(tempRoot, resolved);
  if (resolved !== scratch || !relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Fixture cleanup requires the exact physical owned temporary path');
  }
  rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

test('controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects', () => {
  const diagnostic = developmentControllerChildDiagnostic(
    {
      status: null,
      signal: 'SIGTERM',
      stdout: `Bearer private-value\n${'x'.repeat(5000)}`,
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

test('controller failure diagnostics decode buffers and byte views before redaction', () => {
  const stdout = Buffer.from(`Bearer private-value\n${'x'.repeat(5000)}`);
  const stderr = Buffer.from('packet refused: token=private-value\n\u041f\u043e\u043c\u0438\u043b\u043a\u0430');
  const prefix = Buffer.from('outside-view-prefix');
  const suffix = Buffer.from('outside-view-suffix');
  const backing = new Uint8Array(prefix.length + stderr.length + suffix.length);
  backing.set(prefix);
  backing.set(stderr, prefix.length);
  backing.set(suffix, prefix.length + stderr.length);
  for (const streams of [
    { stdout, stderr },
    { stdout: new Uint8Array(stdout), stderr: backing.subarray(prefix.length, prefix.length + stderr.length) },
  ]) {
    const diagnostic = developmentControllerChildDiagnostic({ status: 1, signal: null, ...streams }, 12);
    expect(diagnostic.status).toBe(1);
    expect(diagnostic.stderr.text).toBe('packet refused: token=[redacted]\n\u041f\u043e\u043c\u0438\u043b\u043a\u0430');
    expect(diagnostic.stdout.text.startsWith('Bearer [redacted]\n')).toBe(true);
    expect(diagnostic.stdout.text.length).toBe(4096);
    expect(diagnostic.stdout.truncated).toBe(true);
    expect(diagnostic.stderr.truncated).toBe(false);
    expect(JSON.stringify(diagnostic)).not.toContain('private-value');
    expect(JSON.stringify(diagnostic)).not.toContain('outside-view-');
    expect(diagnostic.outcome).toBe('child_failure_effects_unknown');
  }
  const empty = developmentControllerChildDiagnostic(
    { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: new Uint8Array(0) },
    0,
  );
  expect(empty.stdout).toEqual({ text: '', truncated: false });
  expect(empty.stderr).toEqual({ text: '', truncated: false });
});

test('qualified development controller preserves Source identity and accepts a scoped new target bin through unchanged current code', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-'));
  let completed = false;
  try {
    const controllerRoot = path.join(scratch, 'controller');
    const prepared = await prepareDevelopmentController({ target: sourceRoot, controllerRoot });
    expect(prepared.status).toBe('prepared');
    expect(readFileSync(path.join(prepared.package_root, 'bun.lock')).equals(readPortableLock(packageRoot))).toBe(true);
    expect(prepared.identity.bundle).toBe('packages/agent');
    await Promise.resolve(
      expect(
        executeDevelopmentController({ controllerRoot, command: 'run', args: ['--project-root', sourceRoot] }),
      ).rejects.toThrow('qualified'),
    );
    const ready = await verifyDevelopmentController({ controllerRoot });
    expect(ready.status).toBe('ready');
    if (ready.qualification === undefined) throw new Error('ready controller is missing its qualification');
    expect(ready.qualification.schema).toBe('DevelopmentControllerQualification/v1');
    expect(ready.qualification.checks).toContain('actual-source-report');
    const qualification: unknown = ready.qualification;
    if (typeof qualification !== 'object' || qualification === null || !('runtime_acceptance' in qualification)) {
      throw new TypeError('controller qualification is missing runtime acceptance status');
    }
    expect(qualification.runtime_acceptance).toBe(false);
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
        'packages/agent/bin/development-controller.ts',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(invoked.status, invoked.stderr).toBe(0);
    const invokedOutput: unknown = JSON.parse(invoked.stdout);
    if (
      typeof invokedOutput !== 'object' ||
      invokedOutput === null ||
      Array.isArray(invokedOutput) ||
      !('schema' in invokedOutput)
    ) {
      throw new TypeError('controller scope output must be a schema-bearing object');
    }
    expect(invokedOutput.schema).toBe('ScopedSourceSnapshot/v1');
    console.log(JSON.stringify({ operation: 'warm-controller-exec', elapsed_ms: performance.now() - execStarted }));
    await Promise.resolve(
      expect(
        executeDevelopmentController({ controllerRoot, command: 'scope', args: ['--project-root', scratch] }),
      ).rejects.toThrow('exact original target'),
    );
    const file = path.join(ready.package_root, 'bin/scope.ts');
    const before = readFileSync(file);
    writeFileSync(file, Buffer.concat([before, Buffer.from('\n// altered controller\n')]));
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift'));
    writeFileSync(file, before);
    const manifestFile = path.join(ready.package_root, 'package.json');
    const manifest = readFileSync(manifestFile);
    const manifestValue: unknown = JSON.parse(manifest.toString());
    if (typeof manifestValue !== 'object' || manifestValue === null || Array.isArray(manifestValue)) {
      throw new TypeError('controller manifest must be an object');
    }
    writeFileSync(manifestFile, JSON.stringify({ ...manifestValue, name: 'wrong-package' }));
    await Promise.resolve(
      expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('current vida-agent candidate'),
    );
    writeFileSync(manifestFile, manifest);
    const pinFile = path.join(ready.package_root, '.bun-version');
    const pin = readFileSync(pinFile);
    writeFileSync(pinFile, '1.4.1\n');
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow());
    writeFileSync(pinFile, pin);
    const dependency = ready.package_binding.files.find(
      (file) => file.path.startsWith('node_modules/') && file.path.endsWith('package.json'),
    );
    expect(dependency).toBeDefined();
    if (dependency === undefined) throw new Error('qualified package is missing its dependency manifest');
    const depFile = path.join(ready.package_root, dependency.path);
    const dep = readFileSync(depFile);
    writeFileSync(depFile, '{}');
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift'));
    writeFileSync(depFile, dep);
    completed = true;
  } finally {
    if (completed && process.env.VIDA_CONTROLLER_DIAGNOSTICS !== 'true') cleanupOwnedFixture(scratch);
    else if (completed) console.error(`Retained diagnostic controller fixture: ${scratch}`);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
}, 180000);

test('development controller rejects an active selector and an overlapping or linked target before construction', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-deny-'));
  try {
    mkdirSync(path.join(scratch, '.agent'));
    writeFileSync(path.join(scratch, '.agent/active-runtime-selector.v1.json'), '{}');
    await Promise.resolve(
      expect(
        prepareDevelopmentController({ target: scratch, controllerRoot: path.join(scratch, 'controller') }),
      ).rejects.toThrow('active-selector'),
    );
    const alias = path.join(scratch, 'source-alias');
    symlinkSync(sourceRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
    await Promise.resolve(
      expect(
        prepareDevelopmentController({ target: alias, controllerRoot: path.join(scratch, 'controller') }),
      ).rejects.toThrow('physical'),
    );
    await Promise.resolve(
      expect(
        prepareDevelopmentController({
          target: sourceRoot,
          controllerRoot: path.join(sourceRoot, '.tmp/new-controller'),
        }),
      ).rejects.toThrow('outside'),
    );
  } finally {
    cleanupOwnedFixture(scratch);
  }
});

test('controller portable lock reader binds only declared regular Source or SDK resources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-controller-lock-'));
  try {
    mkdirSync(path.join(root, 'dist/portable'), { recursive: true });
    const source = path.join(root, 'bun.lock');
    const portable = path.join(root, 'dist/portable/bun.lock');
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
