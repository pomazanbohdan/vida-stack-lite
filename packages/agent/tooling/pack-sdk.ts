import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  constants,
  copyFileSync,
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkManifest, pinnedEnvironment, readPin, resolvePinnedBun } from '../bin/bun.ts';
import { readBunPackMetadata, type BunPackEntry } from './bun-pack-metadata.ts';
import { resourceDirectory } from '../bin/standalone-resources.ts';
import { assertRuntimePackageExports, runtimeExecutableInventory } from './maintained-source-inventory.ts';
import { assertCandidatePreflight } from './preflight.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import {
  cleanupOwnedWorkspace,
  ownedDirectoryIdentity,
  ownedTempWorkspace,
  removeOwnedDirectory,
  type OwnedDirectoryIdentity,
  type OwnedTempWorkspace,
} from './owned-staging.ts';

type PackageManifest = Record<string, unknown> & {
  name: string;
  version: string;
  files: string[];
  scripts: Record<string, unknown>;
  exports: unknown;
  main: string;
  types: string;
  engines: Record<string, unknown> & { node: string; npm: string };
  dependencies: Record<string, string>;
};

type TarModule = typeof import('tar');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

function stringProperty(value: Record<string, unknown>, key: string, label: string): string {
  const property = value[key];
  if (typeof property !== 'string') throw new Error(`${label}.${key} must be a string`);
  return property;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') throw new Error(`${label} entries must be strings`);
    result.push(entry);
  }
  return result;
}

function stringRecord(value: unknown, label: string): Record<string, string> {
  const input = record(value, label);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (typeof entry !== 'string') throw new Error(`${label}.${key} must be a string`);
    result[key] = entry;
  }
  return result;
}

function packageManifest(text: string, label: string): PackageManifest {
  const parsed: unknown = JSON.parse(text);
  const value = record(parsed, label);
  const files = stringArray(value.files, `${label}.files`);
  const scripts = record(value.scripts, `${label}.scripts`);
  const engines = record(value.engines, `${label}.engines`);
  return {
    ...value,
    name: stringProperty(value, 'name', label),
    version: stringProperty(value, 'version', label),
    files,
    scripts,
    exports: value.exports,
    main: stringProperty(value, 'main', label),
    types: stringProperty(value, 'types', label),
    engines: {
      ...engines,
      node: stringProperty(engines, 'node', `${label}.engines`),
      npm: stringProperty(engines, 'npm', `${label}.engines`),
    },
    dependencies: stringRecord(value.dependencies, `${label}.dependencies`),
  };
}

function isTarModule(value: unknown): value is TarModule {
  return isRecord(value) && 't' in value && typeof value.t === 'function';
}

function firstPathSegment(relative: string): string {
  const separator = relative.indexOf('/');
  return separator < 0 ? relative : relative.slice(0, separator);
}

function loadTarModule(value: unknown): TarModule {
  if (!isTarModule(value)) throw new Error('npm tar package does not expose its public list command');
  return value;
}

async function verifySdkArchive(input: {
  archive: string;
  root: string;
  manifestBytes: Buffer;
  entry: BunPackEntry;
  tar: TarModule;
}): Promise<Set<string>> {
  const { archive, root, manifestBytes, entry, tar } = input;
  const listed = new Set(entry.files.map((file) => file.path));
  const observed = new Set<string>();
  await tar.t({
    file: archive,
    onentry(item) {
      const relative = item.path.replace(/^package\//, '');
      assert.ok(
        item.path.startsWith('package/') && item.type === 'File',
        'SDK archive must contain only regular package files',
      );
      assert.ok(
        !relative.startsWith('dist/standalone/') &&
          relative !== 'dist/standalone' &&
          !relative.startsWith('node_modules/'),
        'SDK archive contains excluded runtime assets',
      );
      assert.ok(listed.has(relative) && !observed.has(relative), 'SDK archive inventory differs');
      observed.add(relative);
      const chunks: Buffer[] = [];
      item.on('data', (chunk: Buffer | string) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
      item.on('end', () =>
        assert.deepEqual(
          Buffer.concat(chunks),
          relative === 'package.json' ? manifestBytes : regular(root, relative),
          `SDK archive bytes differ: ${relative}`,
        ),
      );
    },
  });
  assert.equal(observed.size, listed.size);
  return listed;
}

function assertSameExistingArchive(archive: string, identity: OwnedDirectoryIdentity): void {
  const current = lstatSync(archive, { bigint: true });
  assert.ok(
    current.isFile() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino,
    'SDK archive destination changed during retry verification',
  );
}

function firstBunPackEntry(entries: BunPackEntry[]): BunPackEntry {
  const entry = entries[0];
  if (entry === undefined) throw new Error('Bun pack returned no metadata entry');
  return entry;
}

function sdkPackArguments(args: string[]): { root: string; destination: string } {
  if (args.length !== 5 || args[0] !== '--pack' || args[1] !== '--root' || args[3] !== '--destination')
    throw new Error('Usage: pack-sdk.ts --verify | --pack --root ABS --destination ABS');
  const root = args[2];
  const destination = args[4];
  if (root === undefined || destination === undefined) throw new Error('SDK pack paths are missing');
  return { root, destination };
}

function absoluteRoot(root: string): string {
  assert.ok(typeof root === 'string' && path.isAbsolute(root), 'SDK package root must be absolute');
  const identity = lstatSync(root);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(), 'SDK package root must be a real directory');
  return root;
}

function manifestAt(root: string): PackageManifest {
  return packageManifest(readFileSync(path.join(root, 'package.json'), 'utf8'), 'package manifest');
}

function npmEngineMajor(specification: string): number {
  assert.match(
    specification,
    /^(0|[1-9]\d*)\.x$/,
    'package manifest.engines.npm must be a whole-major x-range such as 12.x',
  );
  const major = Number(specification.slice(0, specification.indexOf('.')));
  assert.ok(Number.isSafeInteger(major), 'package manifest.engines.npm major must be a safe integer');
  return major;
}

function nodeEngineVersion(specification: string): void {
  assert.match(
    specification,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    'package manifest.engines.node must be a stable semantic version',
  );
}

export function sdkCompatibilityManifest(input: { root: string }): { value: PackageManifest; bytes: Buffer } {
  const { root } = input;
  absoluteRoot(root);
  const value = manifestAt(root);
  assert.equal(value.name, 'vida-agent');
  npmEngineMajor(value.engines.npm);
  nodeEngineVersion(value.engines.node);
  const verifierFiles = [
    'tooling/pack-sdk.ts',
    'tooling/bun-pack-metadata.ts',
    'tooling/owned-staging.ts',
    'tooling/owned-cleanup-completion.ts',
    'tooling/maintained-source-inventory.ts',
    'tooling/preflight.ts',
  ];
  const verifierFileSet = new Set(verifierFiles);
  value.files = value.files.filter((entry) => {
    if (entry === 'bun.lock') return false;
    if (entry === 'bin/standalone-resources.ts') return true;
    if (/standalone|release-notes|release-publish/.test(entry)) return false;
    if (entry === 'TESTING.md' || entry === 'tsconfig.json' || entry === '.oxfmtrc.json') return false;
    if (['oxlint.config.json', 'stryker.config.ts', 'vitest.config.ts'].includes(entry)) return false;
    if (entry.startsWith('tests/')) return false;
    if (entry.startsWith('tooling/')) return verifierFileSet.has(entry);
    return true;
  });
  delete value.bin;
  value.files = [...new Set([...value.files, ...verifierFiles])];
  value.scripts = { prepack: 'bun bin/bun.ts tooling/pack-sdk.ts --verify' };
  return { value, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') };
}

function run(command: string, args: string[], root: string, env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, `SDK package command could not start: ${result.error?.message}`);
  assert.equal(result.signal, null, `SDK package command interrupted: ${result.signal}`);
  assert.equal(
    result.status,
    0,
    `SDK package command failed: ${command} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`,
  );
  return result.stdout;
}

function tools(root: string): { bun: string; env: NodeJS.ProcessEnv } {
  const bun = resolvePinnedBun({ root });
  return { bun, env: pinnedEnvironment(bun, process.env, root) };
}

function regular(root: string, relative: string): Buffer {
  assert.ok(
    typeof relative === 'string' && !path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'),
    'SDK payload path must be relative',
  );
  const file = path.join(root, relative);
  const parts = relative.split(/[\\/]/).filter((part) => part !== '.');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    assert.ok(!lstatSync(current).isSymbolicLink(), `SDK payload link forbidden: ${relative}`);
  }
  assert.ok(lstatSync(file).isFile(), `SDK payload file missing: ${relative}`);
  return readFileSync(file);
}

export async function verifySdkPackage(input: { root: string }): Promise<void> {
  const { root } = input;
  absoluteRoot(root);
  const manifest = sdkCompatibilityManifest({ root }).value;
  const { bun, env } = tools(root);
  const pin = readPin(root);
  checkManifest(root, pin);
  assertRuntimePackageExports(root);
  for (const relative of runtimeExecutableInventory(root, 'dist')) regular(root, relative);
  const targets = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : isRecord(value) ? Object.values(value).flatMap(targets) : [];
  assert.equal(manifest.bin, undefined, 'SDK libraries must not register public CLI commands');
  for (const relative of [...targets(manifest.exports), manifest.main, manifest.types])
    assert.ok(regular(root, relative).length > 0, `SDK public target is empty: ${relative}`);
  const declarations = new Set<string>();
  function verifyDeclaration(relative: string): void {
    if (declarations.has(relative)) return;
    declarations.add(relative);
    const text = regular(root, relative).toString('utf8');
    assert.ok(
      !/export\s+(?:declare\s+)?function\s+(?:createTest\w*|\w*ForTests)\b/.test(text),
      'SDK declaration exposes a test issuer',
    );
    for (const match of text.matchAll(/(?:from\s*|import\s*\()['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier === undefined) throw new Error('SDK declaration import path is missing');
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), specifier.replace(/\.js$/, '.d.ts')),
      );
      verifyDeclaration(target);
    }
  }
  for (const relative of targets(manifest.exports).filter((entry) => entry.endsWith('.d.ts')))
    verifyDeclaration(relative.replace(/^\.\//, ''));
  for (const entry of manifest.files) {
    if (entry.startsWith('!') || entry.startsWith('dist/standalone/')) continue;
    if (!entry.includes('*')) regular(root, entry);
  }
  for (const directory of ['schemas', 'templates', 'instructions'])
    assert.ok(readdirSync(path.join(root, directory)).length > 0, `SDK resource directory is empty: ${directory}`);
  for (const file of [
    'AGENTS.template.md',
    'AGENT.sidecar.template.md',
    'agent-runtime.config.template.v1.yaml',
    'documentation-policy.template.v1.json',
  ])
    assert.ok(regular(root, 'templates/' + file).length > 0, `SDK template is empty: ${file}`);
  for (const file of readdirSync(path.join(root, 'schemas')).filter((entry) => entry.endsWith('.json')))
    assert.deepEqual(
      regular(root, 'dist/schemas/' + file),
      regular(root, 'schemas/' + file),
      `SDK schema copy differs: ${file}`,
    );
  const rootLockExists = lstatSync(path.join(root, 'bun.lock'), { throwIfNoEntry: false }) !== undefined;
  const lockRelative = rootLockExists ? 'bun.lock' : 'dist/portable/bun.lock';
  const lockBytes = regular(root, lockRelative);
  if (rootLockExists)
    assert.deepEqual(regular(root, 'dist/portable/bun.lock'), lockBytes, 'SDK portable frozen lock differs');
  assertCandidatePreflight(root);
  run(
    bun,
    [
      '-e',
      `import assert from 'node:assert/strict'; const lock=Bun.JSONC.parse(await Bun.file(${JSON.stringify(lockRelative)}).text()); const manifest=await Bun.file('package.json').json(); assert.deepEqual(lock.workspaces[''].dependencies,manifest.dependencies); assert.deepEqual(lock.workspaces[''].devDependencies,manifest.devDependencies); for(const [name,version] of Object.entries(manifest.dependencies)){const installed=await Bun.file('node_modules/'+name+'/package.json').json();assert.equal(installed.version,version,'frozen dependency '+name)}; for(const name of ['index','trusted-host']){const source=await Bun.file('src/'+name+'.ts').text();const expected=new Bun.Transpiler({loader:'ts'}).scan(source).exports.sort();const actual=await import('./dist/src/'+name+'.js'); assert.deepEqual(Object.keys(actual).sort(),expected);assert.ok(Object.keys(actual).every(key=>!/^createTest|TestIssuer|ForTests/.test(key)))};`,
    ],
    root,
    env,
  );
}

export function packSdkCompatibility(input: { root: string; destination: string }) {
  return packSdkCompatibilityOperation(input);
}

async function packSdkCompatibilityOperation(input: {
  root: string;
  destination: string;
}): Promise<{ archive: string; metadata: BunPackEntry[]; manifest: { value: PackageManifest; bytes: Buffer } }> {
  const { root, destination } = input;
  absoluteRoot(root);
  const { bun: pinnedBun, env: rootEnv } = tools(root);
  assert.ok(
    typeof destination === 'string' && path.isAbsolute(destination),
    'SDK archive destination must be absolute',
  );
  const manifest = sdkCompatibilityManifest({ root });
  resourceDirectory(destination, true);
  const destinationIdentity = ownedDirectoryIdentity(destination);
  const finalName = `vida-agent-${manifest.value.version}.tgz`;
  const finalArchive = path.join(destination, finalName);
  const existingArchive = lstatSync(finalArchive, { bigint: true, throwIfNoEntry: false });
  if (existingArchive !== undefined)
    assert.ok(
      existingArchive.isFile() && !existingArchive.isSymbolicLink(),
      'SDK archive destination is not a regular file',
    );
  const temporaryWorkspace: OwnedTempWorkspace = ownedTempWorkspace('vida-sdk-pack-');
  const temporary = temporaryWorkspace.dir;
  const stage = path.join(temporary, 'package');
  const archiveDirectory = path.join(temporary, 'archives');
  const excluded = new Set(['node_modules', '.git', '.tmp', '.agent', '.pack-inspect', 'coverage']);
  let publication: string | undefined;
  let publicationIdentity: OwnedDirectoryIdentity | undefined;
  let primaryFailure: { error: unknown } | undefined;
  try {
    mkdirSync(archiveDirectory);
    cpSync(root, stage, {
      recursive: true,
      filter(source) {
        const relative = path.relative(root, source).replaceAll('\\', '/');
        if (
          excluded.has(firstPathSegment(relative)) ||
          relative === 'dist/standalone' ||
          relative.startsWith('dist/standalone/')
        )
          return false;
        assert.ok(!lstatSync(source).isSymbolicLink(), `SDK staging link forbidden: ${relative}`);
        return true;
      },
    });
    writeFileSync(path.join(stage, 'package.json'), manifest.bytes);
    symlinkSync(
      path.join(root, 'node_modules'),
      path.join(stage, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const env = pinnedEnvironment(pinnedBun, rootEnv, stage);
    if (process.platform !== 'win32' && path.basename(pinnedBun) !== 'bun') {
      const launcherDirectory = path.join(temporary, 'bun-bin');
      mkdirSync(launcherDirectory);
      symlinkSync(pinnedBun, path.join(launcherDirectory, 'bun'));
      env.PATH = `${launcherDirectory}${path.delimiter}${env.PATH ?? ''}`;
    }
    const expected = path.join(archiveDirectory, finalName);
    run(pinnedBun, ['pm', 'pack', '--filename', expected], stage, env);
    const metadata = await readBunPackMetadata({
      archive: expected,
      name: manifest.value.name,
      version: manifest.value.version,
      filename: finalName,
    });
    assert.equal(metadata.length, 1);
    const entry = firstBunPackEntry(metadata);
    assert.equal(entry.name, manifest.value.name);
    assert.equal(entry.version, manifest.value.version);
    assert.equal(entry.filename, path.basename(expected));
    assert.equal(
      entry.integrity,
      'sha512-' + createHash('sha512').update(regular(archiveDirectory, entry.filename)).digest('base64'),
    );
    const verifiedArchive = regular(archiveDirectory, entry.filename);
    const listed = new Set(entry.files.map((file) => file.path));
    assert.ok(listed.has('tooling/pack-sdk.ts'));
    assert.ok(listed.has('tooling/owned-staging.ts'));
    assert.ok(listed.has('tooling/bun-pack-metadata.ts'));
    const tarValue: unknown = createRequire(import.meta.url)('tar');
    const tar = loadTarModule(tarValue);
    await verifySdkArchive({ archive: expected, root, manifestBytes: manifest.bytes, entry, tar });
    assert.ok(listed.has('dist/src/index.js') && listed.has('dist/src/trusted-host.d.ts'));
    if (existingArchive !== undefined) {
      const existingIdentity: OwnedDirectoryIdentity = { dev: existingArchive.dev, ino: existingArchive.ino };
      assert.deepEqual(
        ownedDirectoryIdentity(destination),
        destinationIdentity,
        'SDK destination directory was replaced',
      );
      assertSameExistingArchive(finalArchive, existingIdentity);
      const existingBytes = regular(destination, finalName);
      await verifySdkArchive({ archive: finalArchive, root, manifestBytes: manifest.bytes, entry, tar });
      assert.deepEqual(regular(destination, finalName), existingBytes, 'SDK archive changed during retry verification');
      assertSameExistingArchive(finalArchive, existingIdentity);
      assert.deepEqual(
        ownedDirectoryIdentity(destination),
        destinationIdentity,
        'SDK destination directory was replaced',
      );
      const integrity = 'sha512-' + createHash('sha512').update(existingBytes).digest('base64');
      return { archive: finalArchive, metadata: [{ ...entry, integrity }], manifest };
    }
    assert.deepEqual(
      ownedDirectoryIdentity(destination),
      destinationIdentity,
      'SDK destination directory was replaced',
    );
    assert.ok(!existsSync(finalArchive), 'SDK archive destination appeared during packaging');
    publication = mkdtempSync(path.join(destination, '.vida-sdk-publish-'));
    publicationIdentity = ownedDirectoryIdentity(publication);
    const stagedPublication = path.join(publication, finalName);
    copyFileSync(expected, stagedPublication, constants.COPYFILE_EXCL);
    assert.deepEqual(
      regular(publication, finalName),
      verifiedArchive,
      'SDK publication copy differs from verified archive',
    );
    assert.deepEqual(
      ownedDirectoryIdentity(destination),
      destinationIdentity,
      'SDK destination directory was replaced',
    );
    linkSync(stagedPublication, finalArchive);
    assert.deepEqual(
      regular(destination, finalName),
      verifiedArchive,
      'Published SDK archive differs from verified bytes',
    );
    assert.deepEqual(
      ownedDirectoryIdentity(destination),
      destinationIdentity,
      'SDK destination directory was replaced',
    );
    return { archive: finalArchive, metadata, manifest };
  } catch (error: unknown) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [() => removeOwnedDirectory(publication, publicationIdentity), () => cleanupOwnedWorkspace(temporaryWorkspace)],
      primaryFailure,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--verify') {
    await verifySdkPackage({ root: path.resolve(import.meta.dirname, '..') });
  } else {
    const result = await packSdkCompatibility(sdkPackArguments(args));
    process.stdout.write(JSON.stringify(result.metadata) + '\n');
  }
}
