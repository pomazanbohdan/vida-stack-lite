import { expect, test, spyOn } from 'bun:test';
import { createHash } from 'node:crypto';
import fs, {
  closeSync,
  fstatSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { openRootFileSync, type OpenRootFileSyncParams } from '@openclaw/fs-safe/advanced';
import { instrumentSource } from '../tooling/bun-coverage-evidence.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

type JsonRecord = Record<string, unknown>;
type BunLockEntry = readonly [string, string, JsonRecord, string?];
type IoFs = NonNullable<OpenRootFileSyncParams['ioFs']>;

const fsSafeReadFlags = {
  maxBytes: 64 * 1024 * 1024,
  rejectHardlinks: false,
  rejectSymlinks: true,
  allowedType: 'file',
} as const;

function withFreshFsSafeFixture(run: (fixturePath: string, rootPath: string) => void): void {
  const fixturePath = mkdtempSync(path.join(tmpdir(), 'vida-fs-safe-root-admission-'));
  const rootPath = path.join(fixturePath, 'root');
  let assertionsPassed = false;
  try {
    mkdirSync(rootPath);
    run(fixturePath, rootPath);
    assertionsPassed = true;
  } finally {
    if (assertionsPassed) rmSync(fixturePath, { recursive: true, force: false });
    else console.error(`Retained fs-safe root admission fixture after failure: ${fixturePath}`);
  }
}

function openFixtureFile(absolutePath: string, rootPath: string, ioFs?: IoFs) {
  const canonicalRoot = realpathSync(rootPath);
  return openRootFileSync({
    absolutePath,
    rootPath: canonicalRoot,
    rootRealPath: canonicalRoot,
    boundaryLabel: 'fs-safe canonical-root regression',
    ...fsSafeReadFlags,
    ...(ioFs === undefined ? {} : { ioFs }),
  });
}

function expectDeniedAndClosed(result: ReturnType<typeof openRootFileSync>, fd: number | undefined): void {
  expect(result.ok).toBe(false);
  expect(fd).toBeDefined();
  if (fd === undefined) throw new Error('The leaf open was not observed.');
  expect(() => fstatSync(fd)).toThrow(/EBADF/u);
}

function interceptedLeafOpen(targetPath: string, afterOpen: (fd: number) => void): IoFs {
  return {
    ...fs,
    openSync: (filePath, flags, mode) => {
      const fd = fs.openSync(filePath, flags, mode);
      try {
        if (typeof filePath === 'string' && path.resolve(filePath) === targetPath) afterOpen(fd);
      } catch (error) {
        closeSync(fd);
        throw error;
      }
      return fd;
    },
  };
}

const fsSafeRequire = createRequire(import.meta.url);
const fsSafeAttestationModulePath = fsSafeRequire.resolve('../src/config/fs-safe-attestation.ts');

function loadFsSafeAttestation(): typeof import('../src/config/fs-safe-attestation.ts') {
  delete fsSafeRequire.cache[fsSafeAttestationModulePath];
  return fsSafeRequire(fsSafeAttestationModulePath) as typeof import('../src/config/fs-safe-attestation.ts');
}

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

function packageTreeHash(
  packageRoot: string,
  nativeRoot: string,
  nativeTarget: string,
  manifest: readonly string[],
): string {
  const files = [
    ...manifest.map((relative) => ({ root: packageRoot, relative, logical: relative })),
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

test('the pinned fs-safe attestation source has no callable or branch nodes', () => {
  const sourcePath = path.join(packageDirectory, 'src/config/fs-safe-attestation.ts');
  const { fileCoverage } = instrumentSource(sourcePath, readFileSync(sourcePath, 'utf8'));

  expect(Object.keys(fileCoverage.fnMap)).toEqual([]);
  expect(Object.keys(fileCoverage.branchMap)).toEqual([]);
});

test('fs-safe version and integrity match the installed package and exact Bun lock entry', () => {
  const { fsSafeIntegrity, fsSafeVersion } = loadFsSafeAttestation();
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
  const { fsSafePackageManifest } = loadFsSafeAttestation();
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
  const { fsSafePackageTreeSha256ByNativeTarget, fsSafeVersion } = loadFsSafeAttestation();
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
    const { fsSafePackageManifest, fsSafePackageTreeSha256ByNativeTarget, fsSafeVersion } = loadFsSafeAttestation();
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
    const actualTreeHash = expectReturned(() =>
      packageTreeHash(packageRoot, nativeRoot, nativeTarget, fsSafePackageManifest),
    );
    expect(fsSafePackageTreeSha256ByNativeTarget[nativeTarget]).toBe(actualTreeHash);
  },
);

test('fs-safe advanced root admission preserves canonical package-file reads', () => {
  withFreshFsSafeFixture((_fixturePath, rootPath) => {
    const targetPath = path.join(rootPath, 'package.json');
    const contents = Buffer.from('{"name":"fixture-package"}\n');
    writeFileSync(targetPath, contents);

    const opened = openFixtureFile(targetPath, rootPath);
    if (!opened.ok) throw new Error(`Canonical package-file read was denied: ${opened.reason}`);
    try {
      expect(opened.rootRealPath).toBe(realpathSync(rootPath));
      expect(readFileSync(opened.fd)).toEqual(contents);
    } finally {
      closeSync(opened.fd);
    }
  });
});

test('fs-safe advanced root admission denies a changed Root identity after the leaf fd opens', () => {
  withFreshFsSafeFixture((_fixturePath, rootPath) => {
    const targetPath = path.join(rootPath, 'package.json');
    const contents = Buffer.from('{"name":"root-identity-package"}\n');
    writeFileSync(targetPath, contents);
    let openedFd: number | undefined;
    let changedRootObservation = false;
    const ioFs = interceptedLeafOpen(targetPath, (fd) => {
      openedFd = fd;
    });
    ioFs.lstatSync = new Proxy(ioFs.lstatSync, {
      apply(target, receiver, args) {
        const stat: unknown = Reflect.apply(target, receiver, args);
        if (openedFd === undefined || args[0] !== rootPath || typeof stat !== 'object' || stat === null) return stat;
        return new Proxy(stat, {
          get(targetStat, key, statReceiver) {
            const value: unknown = Reflect.get(targetStat, key, statReceiver);
            if (key !== 'ino') return value;
            if (typeof value !== 'bigint') throw new Error('Expected a bigint Root identity observation.');
            changedRootObservation = true;
            return value ^ 1n;
          },
        });
      },
    });
    const result = openFixtureFile(targetPath, rootPath, ioFs);
    expect(changedRootObservation).toBe(true);
    expectDeniedAndClosed(result, openedFd);
    expect(readFileSync(targetPath)).toEqual(contents);
    if (result.ok || !(result.error instanceof Error)) throw new Error('Expected the Root identity denial.');
    expect(result.error).toMatchObject({ code: 'path-mismatch' });
  });
});

test.skipIf(process.platform !== 'linux')(
  'fs-safe advanced root admission denies real root replacement with unchanged leaf identity',
  () => {
    withFreshFsSafeFixture((fixturePath, rootPath) => {
      const targetPath = path.join(rootPath, 'package.json');
      const original = Buffer.from('{"name":"original-package"}\n');
      const movedRootPath = path.join(fixturePath, 'moved-root');
      writeFileSync(targetPath, original);
      let injected = false;
      let openedFd: number | undefined;
      const ioFs = interceptedLeafOpen(targetPath, (fd) => {
        openedFd = fd;
        renameSync(rootPath, movedRootPath);
        mkdirSync(rootPath);
        linkSync(path.join(movedRootPath, 'package.json'), path.join(rootPath, 'package.json'));
        injected = true;
      });

      const result = openFixtureFile(targetPath, rootPath, ioFs);
      expect(injected).toBe(true);
      expectDeniedAndClosed(result, openedFd);
      expect(readFileSync(path.join(movedRootPath, 'package.json'))).toEqual(original);
      expect(readFileSync(targetPath)).toEqual(original);
      if (result.ok || !(result.error instanceof Error)) throw new Error('Expected the Root identity denial.');
      expect(result.error).toMatchObject({ code: 'path-mismatch' });
    });
  },
);

test('fs-safe advanced root admission denies a same-byte leaf replacement after open', () => {
  withFreshFsSafeFixture((fixturePath, rootPath) => {
    const targetPath = path.join(rootPath, 'package.json');
    const movedLeafPath = path.join(fixturePath, 'moved-package.json');
    const contents = Buffer.from('{"name":"same-byte-package"}\n');
    writeFileSync(targetPath, contents);
    let injected = false;
    let openedFd: number | undefined;
    let openedIdentity: { dev: bigint; ino: bigint } | undefined;
    const ioFs = interceptedLeafOpen(targetPath, (fd) => {
      openedFd = fd;
      const openedStat = fstatSync(fd, { bigint: true });
      openedIdentity = { dev: openedStat.dev, ino: openedStat.ino };
      renameSync(targetPath, movedLeafPath);
      writeFileSync(targetPath, contents);
      injected = true;
    });

    const result = openFixtureFile(targetPath, rootPath, ioFs);
    expect(injected).toBe(true);
    expectDeniedAndClosed(result, openedFd);
    expect(readFileSync(targetPath)).toEqual(contents);
    expect(readFileSync(movedLeafPath)).toEqual(contents);
    expect(openedIdentity).toBeDefined();
    if (openedIdentity === undefined) throw new Error('The opened leaf identity was not captured.');
    const replacementStat = statSync(targetPath, { bigint: true });
    expect([replacementStat.dev, replacementStat.ino]).not.toEqual([openedIdentity.dev, openedIdentity.ino]);
  });
});

test('fs-safe advanced root admission denies a final canonical path escape observed by ioFs.realpathSync', () => {
  withFreshFsSafeFixture((fixturePath, rootPath) => {
    const targetPath = path.join(rootPath, 'package.json');
    const escapedPath = path.join(fixturePath, 'outside-package.json');
    const contents = Buffer.from('{"name":"canonical-path-package"}\n');
    writeFileSync(targetPath, contents);
    writeFileSync(escapedPath, contents);
    let openedFd: number | undefined;
    const ioFs: IoFs = {
      ...fs,
      openSync: (filePath, flags, mode) => {
        const fd = fs.openSync(filePath, flags, mode);
        if (typeof filePath === 'string' && path.resolve(filePath) === targetPath) openedFd = fd;
        return fd;
      },
    };
    const observation = spyOn(ioFs, 'realpathSync').mockReturnValue(escapedPath);
    try {
      const result = openFixtureFile(targetPath, rootPath, ioFs);
      expect(observation).toHaveBeenCalledTimes(1);
      expect(observation).toHaveBeenCalledWith(targetPath);
      expectDeniedAndClosed(result, openedFd);
    } finally {
      observation.mockRestore();
    }
  });
});

test.skipIf(process.platform !== 'linux')('fs-safe advanced root admission rejects an actual nested symlink', () => {
  withFreshFsSafeFixture((_fixturePath, rootPath) => {
    const targetPath = path.join(rootPath, 'inside', 'package.json');
    const linkPath = path.join(rootPath, 'nested-link');
    mkdirSync(path.dirname(targetPath));
    writeFileSync(targetPath, Buffer.from('{"name":"nested-link-target"}\n'));
    symlinkSync(path.dirname(targetPath), linkPath, 'dir');

    const result = openFixtureFile(path.join(linkPath, 'package.json'), rootPath);
    expect(result.ok).toBe(false);
  });
});

test.skipIf(process.platform !== 'linux')(
  'fs-safe advanced root admission denies a Root ancestor redirect after open',
  () => {
    withFreshFsSafeFixture((fixturePath, rootPath) => {
      const parent = path.join(fixturePath, 'parent');
      const movedParent = path.join(fixturePath, 'moved-parent');
      const nestedRoot = path.join(parent, 'root');
      mkdirSync(parent);
      renameSync(rootPath, nestedRoot);
      const targetPath = path.join(nestedRoot, 'package.json');
      const contents = Buffer.from('{"name":"ancestor-redirect-package"}\n');
      writeFileSync(targetPath, contents);
      let openedFd: number | undefined;
      let injected = false;
      const ioFs = interceptedLeafOpen(targetPath, (fd) => {
        openedFd = fd;
        renameSync(parent, movedParent);
        symlinkSync(movedParent, parent, 'dir');
        injected = true;
      });
      const result = openFixtureFile(targetPath, nestedRoot, ioFs);
      expect(injected).toBe(true);
      expectDeniedAndClosed(result, openedFd);
      expect(readFileSync(path.join(movedParent, 'root', 'package.json'))).toEqual(contents);
      if (result.ok || !(result.error instanceof Error)) throw new Error('Expected the canonical path escape denial.');
      expect(result.error).toMatchObject({ code: 'outside-workspace' });
    });
  },
);

test.skipIf(process.platform !== 'linux')(
  'fs-safe advanced root admission rejects an actual symlink ancestor redirect',
  () => {
    withFreshFsSafeFixture((fixturePath, rootPath) => {
      const outsidePath = path.join(fixturePath, 'outside');
      const targetPath = path.join(outsidePath, 'package.json');
      const redirectPath = path.join(rootPath, 'redirect');
      mkdirSync(outsidePath);
      writeFileSync(targetPath, Buffer.from('{"name":"redirect-target"}\n'));
      symlinkSync(outsidePath, redirectPath, 'dir');

      const result = openFixtureFile(path.join(redirectPath, 'package.json'), rootPath);
      expect(result.ok).toBe(false);
    });
  },
);
