import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPin } from '../bin/bun.ts';
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

function writeManifest(root: string, versions: { bun: string; node: string }, npm: unknown): void {
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'vida-agent',
      version: '0.0.0',
      files: [],
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
