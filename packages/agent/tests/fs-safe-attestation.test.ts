import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fsSafeIntegrity,
  fsSafePackageManifest,
  fsSafePackageTreeSha256ByNativeTarget,
  fsSafeVersion,
} from '../src/config/fs-safe-attestation.ts';

type JsonRecord = Record<string, unknown>;
type BunLockEntry = readonly [string, string, JsonRecord, string?];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lockEntry(lock: unknown, name: string): BunLockEntry {
  if (!isRecord(lock) || !isRecord(lock.packages)) throw new Error('Bun lock package table is invalid.');
  const value: unknown = lock.packages[name];
  if (
    !Array.isArray(value) ||
    typeof value[0] !== 'string' ||
    typeof value[1] !== 'string' ||
    !isRecord(value[2]) ||
    (value[3] !== undefined && typeof value[3] !== 'string')
  )
    throw new Error(`Bun lock entry is invalid: ${name}`);
  return [value[0], value[1], value[2], value[3]];
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function readJson5(file: string): unknown {
  // bun.lock has trailing commas; the pinned Bun JSON5 API parses its JSONC form.
  return Bun.JSON5.parse(readFileSync(file, 'utf8'));
}

function recordField(record: JsonRecord, key: string, label: string): JsonRecord {
  const value = record[key];
  if (!isRecord(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function enumerateRegularFiles(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Installed fs-safe package contains a link: ${relative}`);
    if (entry.isDirectory()) return enumerateRegularFiles(absolute, relative);
    if (!entry.isFile()) throw new Error(`Installed fs-safe package contains a non-file entry: ${relative}`);
    return [relative];
  });
}

function installedPackageRoot(requireFromTest: NodeJS.Require): string {
  const entry = realpathSync(requireFromTest.resolve('@openclaw/fs-safe'));
  return path.resolve(path.dirname(entry), '..');
}

function installedNativeRoot(packageRoot: string, packageName: string): string {
  const packageRequire = createRequire(path.join(packageRoot, 'dist', 'native.js'));
  const entry = realpathSync(packageRequire.resolve(packageName));
  return path.dirname(entry);
}

function packageTreeHash(packageRoot: string, nativeRoot: string, nativeTarget: string): string {
  const files = [
    ...fsSafePackageManifest.map((relative) => ({ root: packageRoot, relative, logical: relative })),
    ...['package.json', 'fs-safe-native.node'].map((relative) => ({
      root: nativeRoot,
      relative,
      logical: `native/${nativeTarget}/${relative}`,
    })),
  ].sort((left, right) => (left.logical < right.logical ? -1 : Number(left.logical > right.logical)));
  const digest = createHash('sha256');
  for (const file of files) {
    const bytes = readFileSync(path.join(file.root, file.relative));
    const fileHash = createHash('sha256').update(bytes).digest('hex');
    digest.update(`file\0${file.logical}\0${bytes.byteLength}\0${fileHash}\0`);
  }
  return digest.digest('hex');
}

const packageRoot = installedPackageRoot(createRequire(import.meta.url));
const rootPackage = readJson(path.join(packageRoot, 'package.json'));
const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectManifest = readJson(path.join(packageDirectory, 'package.json'));
const bunLock = readJson5(path.join(packageDirectory, 'bun.lock'));

test('fs-safe version and integrity match the installed package and exact Bun lock entry', () => {
  if (!isRecord(rootPackage) || !isRecord(projectManifest)) throw new Error('Package manifest is invalid.');
  const dependencies = recordField(projectManifest, 'dependencies', 'Project dependencies');
  const rootEntry = lockEntry(bunLock, '@openclaw/fs-safe');
  expect(rootPackage.name).toBe('@openclaw/fs-safe');
  expect(rootPackage.version).toBe(fsSafeVersion);
  expect(dependencies['@openclaw/fs-safe']).toBe(fsSafeVersion);
  expect(rootEntry[0]).toBe(`@openclaw/fs-safe@${fsSafeVersion}`);
  expect(rootEntry[3]).toBe(fsSafeIntegrity);
});

test('fs-safe manifest exactly names installed runtime files and package metadata', () => {
  const installedFiles = [
    // Declaration files are compiler metadata outside the runtime attestation scope.
    ...enumerateRegularFiles(path.join(packageRoot, 'dist'))
      .filter((file) => !file.endsWith('.d.ts'))
      .map((file) => `dist/${file}`),
    'package.json',
  ].sort();
  const attestedFiles: string[] = [...fsSafePackageManifest].sort();
  expect(new Set(attestedFiles).size).toBe(attestedFiles.length);
  expect(attestedFiles).toEqual(installedFiles);
});

test('every attested native target has a SHA256 tree digest and a dependency at the locked version', () => {
  const rootEntry = lockEntry(bunLock, '@openclaw/fs-safe');
  const dependencies = recordField(rootEntry[2], 'optionalDependencies', 'fs-safe optional dependencies');
  const prefix = '@openclaw/fs-safe-';
  const supportedTargets = [
    'win32-x64-msvc',
    'linux-x64-gnu',
    'linux-x64-musl',
    'linux-arm64-gnu',
    'linux-arm64-musl',
  ].sort();
  expect(Object.keys(fsSafePackageTreeSha256ByNativeTarget).sort()).toEqual(supportedTargets);
  for (const [target, digest] of Object.entries(fsSafePackageTreeSha256ByNativeTarget)) {
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(dependencies[prefix + target]).toBe(fsSafeVersion);
    expect(lockEntry(bunLock, prefix + target)[0]).toBe(`${prefix}${target}@${fsSafeVersion}`);
  }
});

test
  .skipIf(process.platform !== 'linux' || process.arch !== 'x64')
  .each([['linux-x64-gnu'], ['linux-x64-musl']] as const)(
  'fs-safe tree digest matches installed %s package bytes',
  (nativeTarget) => {
    const nativePackageName = `@openclaw/fs-safe-${nativeTarget}`;
    const rootEntry = lockEntry(bunLock, '@openclaw/fs-safe');
    const optionalDependencies = recordField(rootEntry[2], 'optionalDependencies', 'fs-safe optional dependencies');
    const nativeEntry = lockEntry(bunLock, nativePackageName);
    const nativeRoot = installedNativeRoot(packageRoot, nativePackageName);
    const nativePackage = readJson(path.join(nativeRoot, 'package.json'));

    expect(optionalDependencies[nativePackageName]).toBe(fsSafeVersion);
    expect(nativeEntry[0]).toBe(`${nativePackageName}@${fsSafeVersion}`);
    expect(isRecord(nativePackage)).toBe(true);
    if (!isRecord(nativePackage)) throw new Error(`Native package metadata is invalid: ${nativePackageName}`);
    expect(nativePackage.name).toBe(nativePackageName);
    expect(nativePackage.version).toBe(fsSafeVersion);
    expect(nativePackage.main).toBe('fs-safe-native.node');
    expect(fsSafePackageTreeSha256ByNativeTarget[nativeTarget]).toBe(
      packageTreeHash(packageRoot, nativeRoot, nativeTarget),
    );
  },
);
