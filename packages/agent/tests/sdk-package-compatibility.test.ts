import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPin, boundedSpawnSync, executionBudget, requireTerminalCommand } from '../bin/bun.ts';
import { spawnSync } from 'node:child_process';
import { captureSelectedSdkJavascriptOutputs } from '../tooling/sdk-artifact-capture.ts';
import { captureSdkFormationInputs } from '../tooling/build-package.ts';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';
import { sdkCompatibilityManifest, verifySdkPackage } from '../tooling/pack-sdk.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceVersions(): { bun: string; node: string; npm: string } {
  const source: unknown = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (source === null || typeof source !== 'object' || Array.isArray(source))
    throw new Error('Source package manifest must be an object');
  const packageValue = source as Record<string, unknown>;
  const engines = packageValue.engines;
  if (engines === null || typeof engines !== 'object' || Array.isArray(engines))
    throw new Error('Source package engines must be an object');
  const values = engines as Record<string, unknown>;
  if (typeof values.node !== 'string' || typeof values.npm !== 'string')
    throw new Error('Source Node and npm engine declarations must be strings');
  return { bun: readPin(packageRoot), node: values.node, npm: values.npm };
}

function writeManifest(
  root: string,
  versions: { bun: string; node: string },
  npm: unknown,
  files: string[] = [],
): void {
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'vida-agent',
      version: '0.0.0',
      files,
      scripts: {},
      exports: {},
      main: 'index.js',
      types: 'index.d.ts',
      packageManager: `bun@${versions.bun}`,
      engines: { bun: versions.bun, node: versions.node, npm },
      dependencies: {},
    }),
  );
}

function packageFixture(npm: unknown, node: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-sdk-engine-range-'));
  const versions = sourceVersions();
  writeManifest(root, { bun: versions.bun, node }, npm);
  writeFileSync(path.join(root, '.bun-version'), `${versions.bun}\n`);
  return root;
}

test('SDK compatibility manifest keeps only the SDK prepack hook and payload', () => {
  const source = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    exports: unknown;
    main: string;
    types: string;
  };
  const { value } = sdkCompatibilityManifest({ root: packageRoot });

  expect(value.scripts).toEqual({ prepack: 'bun bin/bun.ts tooling/pack-sdk.ts --verify' });
  expect(value.files.some((entry) => entry.startsWith('tests/'))).toBe(false);
  expect(value.files).not.toContain('TESTING.md');
  expect(value.files).not.toContain('.oxfmtrc.json');
  expect(value.files).not.toContain('oxlint.config.json');
  expect(value.files).not.toContain('stryker.config.ts');
  expect(value.files).not.toContain('vitest.config.ts');
  expect(value.files.filter((entry) => entry.startsWith('tooling/')).sort()).toEqual([
    'tooling/bun-pack-metadata.ts',
    'tooling/maintained-source-inventory.ts',
    'tooling/owned-cleanup-completion.ts',
    'tooling/owned-staging.ts',
    'tooling/pack-sdk.ts',
    'tooling/preflight.ts',
  ]);

  expect(value.exports).toEqual(source.exports);
  expect(value.main).toBe(source.main);
  expect(value.types).toBe(source.types);
  expect(value.files).toContain('dist/src/index.js');
  expect(value.files).toContain('dist/src/runtime.js');
  expect(value.files).toContain('dist/src/documentation/transition-proof.js');
  expect(value.files).toContain('dist/src/trusted-host.js');
  expect(value.files).toContain('dist/sdk-formation.json');
  expect(value.files).toContain('dist/src/**/*.d.ts');
  expect(value.files).toContain('schemas/agent-runtime-config.v1.schema.json');
  expect(value.files).toContain('templates/**');
  expect(value.files).toContain('instructions/**');
  expect(value.files).toContain('dist/portable/bun.lock');
  for (const file of [
    'bin/bun.ts',
    'bin/cli-error-properties.ts',
    'bin/standalone-resources.ts',
    'tooling/pack-sdk.ts',
    'tooling/bun-pack-metadata.ts',
    'tooling/owned-staging.ts',
    'tooling/owned-cleanup-completion.ts',
    'tooling/maintained-source-inventory.ts',
    'tooling/preflight.ts',
  ])
    expect(value.files).toContain(file);
});

test('SDK compatibility manifest omits root bun.lock while retaining the portable lock', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'vida-sdk-lock-projection-'));
  try {
    const versions = sourceVersions();
    writeManifest(temporary, versions, versions.npm, ['bun.lock', 'dist/portable/bun.lock']);
    const { value } = sdkCompatibilityManifest({ root: temporary });
    expect(value.files).not.toContain('bun.lock');
    expect(value.files).toContain('dist/portable/bun.lock');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('SDK compatibility manifest accepts npm whole-major x-ranges', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'vida-sdk-engine-range-'));
  try {
    const versions = sourceVersions();
    writeManifest(temporary, versions, versions.npm);
    expect(sdkCompatibilityManifest({ root: temporary }).value.engines.npm).toBe(versions.npm);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('SDK compatibility manifest rejects malformed consumer engine metadata before package checks', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'vida-sdk-engine-range-'));
  try {
    const versions = sourceVersions();
    for (const specification of ['012.x', '12.2.x', '12.x-beta', '>=12', '', undefined]) {
      writeManifest(temporary, versions, specification);
      expect(() => sdkCompatibilityManifest({ root: temporary })).toThrow(/engines\.npm/);
    }
    writeManifest(temporary, { ...versions, node: '26.x' }, versions.npm);
    expect(() => sdkCompatibilityManifest({ root: temporary })).toThrow(/engines\.node/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('SDK verification treats Node and npm engine declarations as consumer metadata', async () => {
  const versions = sourceVersions();
  const differentNodeVersion = versions.node.split('.');
  differentNodeVersion[2] = String(Number(differentNodeVersion[2]) + 1);
  const npmMajor = Number(versions.npm.slice(0, versions.npm.indexOf('.')));
  const root = packageFixture(`${npmMajor + 1}.x`, differentNodeVersion.join('.'));
  try {
    await expectRejection(verifySdkPackage({ root }), /public exports are incomplete/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('SDK verification checks the exact Bun pin before package artifacts', async () => {
  const versions = sourceVersions();
  const root = packageFixture(versions.npm, versions.node);
  try {
    writeFileSync(
      path.join(root, 'package.json'),
      readFileSync(path.join(root, 'package.json'), 'utf8').replace(`bun@${versions.bun}`, 'bun@0.0.0'),
    );
    await expectRejection(verifySdkPackage({ root }), /Bun manifest mirrors differ/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('distributed runtime denies implicit governance even with test process flags', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-sdk-authentication-'));
  let passed = false;
  try {
    const selectedInputs = await captureSdkFormationInputs(packageRoot);
    const emitted = await captureSelectedSdkJavascriptOutputs(packageRoot, selectedInputs);
    const sdkSubject = path.join(root, 'sdk-subject');
    for (const relative of emitted.paths) {
      const destination = path.join(sdkSubject, relative);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, emitted.readBytes(relative), { flag: 'wx' });
    }
    writeFileSync(path.join(sdkSubject, 'package.json'), '{"type":"module"}\n', { flag: 'wx' });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      path.join(sdkSubject, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const bindings = {
      repositoryRoot: root,
      repositoryId: 'sdk-authentication-fixture',
      projectIds: ['sdk'],
      integrationsDigest: 'f'.repeat(64),
    };
    const script = `
      import assert from 'node:assert/strict';
      const distributed = await import('./dist/src/index.js');
      const bindings = {
        ...${JSON.stringify(bindings)},
        resolveIdentity: () => null,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'fixture', currentRevision: 1 }),
        casWriter: () => undefined,
      };
      assert.throws(() => distributed.createRuntimeKernelHost(bindings), /authentication proof is required/);
      assert.equal(Object.keys(distributed).some((name) => name.startsWith('createTest')), false);
      console.log('distributed authentication denial verified');
    `;
    const result = boundedSpawnSync(
      spawnSync,
      process.execPath,
      ['-e', script],
      {
        cwd: sdkSubject,
        env: { ...process.env, NODE_ENV: 'test', BUN_TEST: '1', VITEST: 'true' },
        windowsHide: true,
        encoding: 'utf8',
        maxBuffer: 128 * 1024,
        timeout: 4_000,
        budget: executionBudget(4_000, 250),
        diagnostics: true,
      },
      'distributed SDK authentication denial',
    );
    requireTerminalCommand(result, 'distributed SDK authentication denial');
    requireSynchronousChildSuccess(result, 'distributed authentication denial verified');
    if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string')
      throw new Error('SDK child UTF-8 output is unavailable.');
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe('distributed authentication denial verified');
    const bundled = emitted.readBytes('dist/src/runtime.js').toString('utf8');
    expect(
      /requireCondition\d*\(false, "test-only trusted host issuer is unavailable outside a test process"\)/.test(
        bundled,
      ),
    ).toBe(true);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed SDK authentication fixture: ' + root);
  }
});
