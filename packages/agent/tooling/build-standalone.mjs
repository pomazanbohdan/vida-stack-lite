import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPin, checkManifest } from '../bin/bun.mjs';
import { standaloneBuildInputInventory } from './maintained-source-inventory.ts';
import { resourceDigest, resourceDirectory, resourceEntryExists, readResource } from '../bin/standalone-resources.mjs';
import {
  cleanupOwnedWorkspace,
  ownedDirectoryIdentity,
  ownedTempWorkspace,
  removeOwnedDirectory,
} from './owned-staging.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';

const targetName = () => 'bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch;
const manifestName = 'manifest.json';
/** @typedef {{ readonly path: string; readonly bytes: number; readonly sha256: string }} SourceInput */
/** @typedef {{ readonly file: string; readonly bytes: number; readonly sha256: string }} StandaloneAsset */
/** @typedef {{ readonly schema: string; readonly version: string; readonly pin: string; readonly target: string; readonly payloadId: string; readonly inputs: SourceInput[]; readonly asset: StandaloneAsset }} StandaloneManifest */
/** @typedef {{ readonly version: string; readonly dependencies: Record<string, string> }} PackageDependencies */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {Buffer} bytes @param {string} label @returns {Record<string, unknown>} */
function readJsonRecord(bytes, label) {
  /** @type {unknown} */
  const value = JSON.parse(bytes.toString('utf8'));
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

/** @param {Record<string, unknown>} value @param {string} key @param {string} label @returns {string} */
function stringProperty(value, key, label) {
  const property = value[key];
  if (typeof property !== 'string') throw new Error(`${label}.${key} must be a string`);
  return property;
}

/** @param {Record<string, unknown>} value @param {string} key @param {string} label @returns {number} */
function numberProperty(value, key, label) {
  const property = value[key];
  if (typeof property !== 'number') throw new Error(`${label}.${key} must be a number`);
  return property;
}

/** @param {Record<string, unknown>} value @param {readonly string[]} keys @param {string} label */
function assertExactFields(value, keys, label) {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key)))
    throw new Error(`${label} has missing or unexpected fields`);
}

/** @param {Record<string, unknown>} entry @param {string} label */
function assertSourceInputShape(entry, label) {
  assertExactFields(entry, ['path', 'bytes', 'sha256'], label);
}

/** @param {unknown} value @param {string} label @returns {SourceInput[]} */
function sourceIndex(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result = [];
  for (const entry of value) {
    if (!isRecord(entry)) throw new Error(`${label} entry must be an object`);
    assertSourceInputShape(entry, label);
    result.push({
      path: stringProperty(entry, 'path', label),
      bytes: numberProperty(entry, 'bytes', label),
      sha256: stringProperty(entry, 'sha256', label),
    });
  }
  return result;
}

/** @param {string} root @returns {PackageDependencies} */
function packageDependencies(root) {
  const manifest = readJsonRecord(readResource(root, 'package.json'), 'package manifest');
  const version = stringProperty(manifest, 'version', 'package manifest');
  const dependencies = manifest.dependencies;
  if (!isRecord(dependencies)) throw new Error('package manifest.dependencies must be an object');
  /** @type {Record<string, string>} */
  const selected = {};
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (typeof dependency !== 'string') throw new Error(`package manifest dependency ${name} must be a version string`);
    selected[name] = dependency;
  }
  return { version, dependencies: selected };
}

/** @param {SourceInput} entry */
function isStandalonePayloadInput(entry) {
  return (
    !entry.path.startsWith('tooling/build-standalone') &&
    !entry.path.startsWith('tooling/pack-sdk') &&
    !entry.path.startsWith('tooling/owned-staging')
  );
}

/** @param {SourceInput[]} entries @param {Map<string, Uint8Array>} payload @returns {Record<string, Uint8Array>} */
function sortedPayload(entries, payload) {
  /** @type {[string, Uint8Array][]} */
  const sortedEntries = [];
  for (const entry of entries) {
    const bytes = payload.get(entry.path);
    if (bytes === undefined) throw new Error(`Standalone payload entry is missing: ${entry.path}`);
    sortedEntries.push([entry.path, bytes]);
  }
  return Object.fromEntries(sortedEntries);
}

/** @param {Record<string, unknown>} value @returns {string} */
function manifestPayloadId(value) {
  const payloadId = stringProperty(value, 'payloadId', 'standalone manifest');
  if (!/^[a-f0-9]{64}$/u.test(payloadId)) throw new Error('standalone manifest.payloadId must be a SHA-256 digest');
  return payloadId;
}

/** @param {string} file @returns {Record<string, unknown>} */
function inspectNativeIdentity(file) {
  /** @type {NodeJS.ProcessEnv} */
  const env = {
    HOME: tmpdir(),
    TMPDIR: tmpdir(),
    TEMP: tmpdir(),
    LANG: 'C',
    LC_ALL: 'C',
  };
  if (process.platform === 'win32') {
    for (const name of ['SYSTEMROOT', 'WINDIR']) {
      const value = process.env[name];
      if (value !== undefined) env[name] = value;
    }
  }
  const result = spawnSync(file, ['--vida-internal-native-identity-v1'], {
    cwd: tmpdir(),
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
    maxBuffer: 64 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const identity = readJsonRecord(Buffer.from(result.stdout), 'standalone identity response');
  assertExactFields(
    identity,
    ['schema', 'version', 'pin', 'target', 'payloadId', 'resourceIndexDigest'],
    'standalone identity response',
  );
  return identity;
}

/** @param {Buffer} bytes @returns {StandaloneManifest} */
function standaloneManifest(bytes) {
  const value = readJsonRecord(bytes, 'standalone manifest');
  assertExactFields(
    value,
    ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset'],
    'standalone manifest',
  );
  const asset = value.asset;
  if (!isRecord(asset)) throw new Error('standalone manifest.asset must be an object');
  assertExactFields(asset, ['file', 'bytes', 'sha256'], 'standalone manifest.asset');
  return {
    schema: stringProperty(value, 'schema', 'standalone manifest'),
    version: stringProperty(value, 'version', 'standalone manifest'),
    pin: stringProperty(value, 'pin', 'standalone manifest'),
    target: stringProperty(value, 'target', 'standalone manifest'),
    payloadId: manifestPayloadId(value),
    inputs: sourceIndex(value.inputs, 'standalone manifest.inputs'),
    asset: {
      file: stringProperty(asset, 'file', 'standalone manifest.asset'),
      bytes: numberProperty(asset, 'bytes', 'standalone manifest.asset'),
      sha256: stringProperty(asset, 'sha256', 'standalone manifest.asset'),
    },
  };
}

/** @param {string} root @returns {SourceInput[]} */
function sourceInputs(root) {
  return standaloneBuildInputInventory(root).map((relative) => {
    const bytes = readResource(root, relative);
    return { path: relative, bytes: bytes.length, sha256: resourceDigest(bytes) };
  });
}

/** Environment for the pinned production dependency materialization. */
function standaloneEnvironment() {
  const env = { ...process.env };
  for (const name of Object.keys(env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'].includes(
        name.toUpperCase(),
      )
    )
      delete env[name];
  return env;
}

/** @param {Error | undefined} error @returns {string} */
function spawnErrorMessage(error) {
  return error?.message ?? '';
}

/** @param {string} file @param {Record<string, string | Uint8Array>} payload @returns {Promise<void>} */
export async function writeStandalonePayload(file, payload) {
  const bytes = await new Bun.Archive(payload, { compress: 'gzip' }).bytes();
  assert.ok(bytes[0] === 0x1f && bytes[1] === 0x8b, 'Standalone payload must be gzip');
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
}

/** @param {{ root: string; index: SourceInput[]; payloadId: string; resourceIndexDigest: string; version: string }} input */
export function standaloneEntrySource({ root, index, payloadId, resourceIndexDigest, version }) {
  const entry = path.join(root, 'bin/standalone.mjs').replaceAll('\\', '/');
  return `import payload from './payload.tar.gz' with {type:'file'}; import {runStandalone} from ${JSON.stringify(entry)}; await runStandalone({payload,index:${JSON.stringify(index)},payloadId:${JSON.stringify(payloadId)},resourceIndexDigest:${JSON.stringify(resourceIndexDigest)},version:${JSON.stringify(version)}});`;
}

/** @param {{ root: string; folder?: string }} input */
export async function verifyStandalone({ root, folder = path.join(root, 'dist/standalone') }) {
  resourceDirectory(root);
  resourceDirectory(folder);
  assert.equal(Bun.version, readPin(root));
  checkManifest(root, Bun.version);
  const manifestPath = path.join(folder, manifestName),
    manifestBytes = readResource(folder, manifestName),
    manifest = standaloneManifest(manifestBytes);
  assert.equal(manifest.schema, 'VidaStandaloneBuild/v1');
  assert.equal(manifest.version, packageDependencies(root).version);
  assert.equal(manifest.pin, '1.4.2');
  assert.equal(manifest.target, targetName());
  assert.deepEqual(
    manifest.inputs,
    sourceInputs(root),
    'Standalone inputs changed; rebuild the current generated output',
  );
  assert.equal(manifest.asset.file, 'vida-agent-' + manifest.target + (process.platform === 'win32' ? '.exe' : ''));
  assert.deepEqual(
    readdirSync(folder).sort(),
    [manifestName, manifest.asset.file].sort(),
    'Standalone output inventory differs',
  );
  const bytes = readResource(folder, manifest.asset.file);
  assert.equal(bytes.length, manifest.asset.bytes);
  assert.equal(resourceDigest(bytes), manifest.asset.sha256);
  assert.deepEqual(inspectNativeIdentity(path.join(folder, manifest.asset.file)), {
    schema: 'VidaStandaloneIdentity/v1',
    version: manifest.version,
    pin: manifest.pin,
    target: manifest.target,
    payloadId: manifest.payloadId,
    resourceIndexDigest: manifest.payloadId,
  });
  assert.deepEqual(
    readResource(folder, manifest.asset.file),
    bytes,
    'Standalone asset changed during identity inspection',
  );
  assert.deepEqual(
    readResource(folder, manifestName),
    manifestBytes,
    'Standalone manifest changed during identity inspection',
  );
  assert.deepEqual(sourceInputs(root), manifest.inputs, 'Standalone source changed during identity inspection');
  return {
    manifestPath,
    assets: [
      {
        path: path.join(folder, manifest.asset.file),
        target: manifest.target,
        bytes: bytes.length,
        sha256: manifest.asset.sha256,
      },
    ],
  };
}

/** @param {{ root: string }} input */
export async function buildStandalone({ root }) {
  resourceDirectory(root);
  assert.equal(Bun.version, '1.4.2');
  checkManifest(root, Bun.version);
  assert.ok(
    (process.platform === 'win32' && process.arch === 'x64') ||
      (process.platform === 'linux' && ['x64', 'arm64'].includes(process.arch)),
    'Standalone target is not implemented',
  );
  const destination = path.join(root, 'dist/standalone');
  if (resourceEntryExists(destination)) return verifyStandalone({ root });
  const destinationParent = path.dirname(destination);
  resourceDirectory(destinationParent);
  const destinationParentIdentity = ownedDirectoryIdentity(destinationParent);
  const inputs = sourceInputs(root),
    manifest = packageDependencies(root);
  const stageWorkspace = ownedTempWorkspace('vida-native-build-');
  const stage = stageWorkspace.dir;
  /** @type {string | undefined} */
  let publication;
  /** @type {{ dev: bigint; ino: bigint } | undefined} */
  let publicationIdentity;
  /** @type {{ error: unknown } | undefined} */
  let primaryFailure;
  try {
    writeFileSync(path.join(stage, 'package.json'), readResource(root, 'package.json'));
    writeFileSync(path.join(stage, 'bun.lock'), readResource(root, 'bun.lock'));
    writeFileSync(path.join(stage, 'bunfig.toml'), readResource(root, 'bunfig.toml'));
    const env = standaloneEnvironment();
    const result = spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '--config=' + path.join(stage, 'bunfig.toml'),
        'install',
        '--frozen-lockfile',
        '--production',
        '--backend=copyfile',
        '--linker=hoisted',
        '--ignore-scripts',
        '--prefer-offline',
      ],
      {
        cwd: stage,
        env,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    assert.equal(result.error, undefined, spawnErrorMessage(result.error));
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    /** @type {Map<string, Uint8Array>} */
    const payload = new Map();
    /** @type {SourceInput[]} */
    const entries = [];
    /** @param {string} relative @param {Uint8Array} bytes */
    const add = (relative, bytes) => {
      payload.set(relative, bytes);
      entries.push({ path: relative, bytes: bytes.length, sha256: resourceDigest(bytes) });
    };
    for (const input of inputs.filter(isStandalonePayloadInput)) add(input.path, readResource(root, input.path));
    /** @param {string} relative */
    const visit = (relative) => {
      for (const entry of readdirSync(path.join(stage, relative), { withFileTypes: true })) {
        const name = relative + '/' + entry.name;
        if (name === 'node_modules/.bin') continue;
        assert.ok(!entry.isSymbolicLink(), 'Production payload contains a link');
        if (entry.isDirectory()) visit(name);
        else {
          assert.ok(entry.isFile());
          add(name, readResource(stage, name));
        }
      }
    };
    visit('node_modules');
    entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
    for (const [name, version] of Object.entries(manifest.dependencies))
      assert.equal(
        stringProperty(
          readJsonRecord(readResource(stage, 'node_modules/' + name + '/package.json'), `dependency ${name} manifest`),
          'version',
          `dependency ${name} manifest`,
        ),
        version,
        'Frozen production dependency differs',
      );
    const resourceIndexDigest = resourceDigest(JSON.stringify(entries)),
      payloadId = resourceIndexDigest,
      payloadPath = path.join(stage, 'payload.tar.gz');
    const payloadArchive = sortedPayload(entries, payload);
    await writeStandalonePayload(payloadPath, payloadArchive);
    const entry = path.join(stage, 'entry.mjs');
    writeFileSync(
      entry,
      standaloneEntrySource({
        root,
        index: entries,
        payloadId,
        resourceIndexDigest,
        version: manifest.version,
      }),
    );
    const output = path.join(stage, 'output');
    mkdirSync(output);
    const file = 'vida-agent-' + targetName() + (process.platform === 'win32' ? '.exe' : '');
    const built = await Bun.build({
      entrypoints: [entry],
      target: 'bun',
      format: 'esm',
      env: 'disable',
      bytecode: true,
      minify: { whitespace: true, syntax: true, identifiers: false, keepNames: true },
      compile: {
        outfile: path.join(output, file),
        autoloadDotenv: false,
        autoloadBunfig: false,
        autoloadPackageJson: false,
        autoloadTsconfig: false,
      },
    });
    assert.ok(built.success, JSON.stringify(built.logs));
    assert.deepEqual(sourceInputs(root), inputs, 'Standalone source changed during build');
    const bytes = readResource(output, file);
    writeFileSync(
      path.join(output, manifestName),
      JSON.stringify(
        {
          schema: 'VidaStandaloneBuild/v1',
          version: manifest.version,
          pin: Bun.version,
          target: targetName(),
          inputs,
          payloadId,
          asset: { file, bytes: bytes.length, sha256: resourceDigest(bytes) },
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
    assert.ok(!resourceEntryExists(destination), 'Standalone output appeared during build');
    // Build staging can be on another volume. Copy files exclusively into an owned sibling, then publish once.
    publication = mkdtempSync(path.join(path.dirname(destination), '.standalone-pending-'));
    publicationIdentity = ownedDirectoryIdentity(publication);
    for (const name of [file, manifestName])
      writeFileSync(path.join(publication, name), readResource(output, name), {
        flag: 'wx',
        mode: name === file ? 0o755 : 0o600,
      });
    const verifiedPublication = await verifyStandalone({ root, folder: publication });
    const verifiedBytes = readResource(publication, file);
    const verifiedManifest = readResource(publication, manifestName);
    assert.deepEqual(sourceInputs(root), inputs, 'Standalone source changed before publication');
    assert.deepEqual(
      ownedDirectoryIdentity(destinationParent),
      destinationParentIdentity,
      'Standalone output parent changed',
    );
    assert.ok(!resourceEntryExists(destination), 'Standalone output conflict');
    renameSync(publication, destination);
    assert.deepEqual(
      ownedDirectoryIdentity(destinationParent),
      destinationParentIdentity,
      'Standalone output parent changed',
    );
    assert.deepEqual(readResource(destination, file), verifiedBytes, 'Published standalone asset differs');
    assert.deepEqual(
      readResource(destination, manifestName),
      verifiedManifest,
      'Published standalone manifest differs',
    );
    assert.deepEqual(
      readdirSync(destination).sort(),
      [manifestName, file].sort(),
      'Published standalone inventory differs',
    );
    const published = verifiedPublication.assets[0];
    assert.ok(published !== undefined, 'Verified standalone asset is missing');
    return {
      manifestPath: path.join(destination, manifestName),
      assets: [{ ...published, path: path.join(destination, file) }],
    };
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [() => removeOwnedDirectory(publication, publicationIdentity), () => cleanupOwnedWorkspace(stageWorkspace)],
      primaryFailure,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(
    [3, 4].includes(process.argv.length) &&
      (process.argv[2] === '--build' || process.argv[2] === '--verify') &&
      (process.argv.length === 3 || process.argv[3] === '--quiet'),
    'Usage: build-standalone.mjs --build|--verify',
  );
  const root = path.resolve(import.meta.dirname, '..');
  const result = await (process.argv[2] === '--build' ? buildStandalone({ root }) : verifyStandalone({ root }));
  if (process.argv[3] !== '--quiet') console.log(JSON.stringify(result));
}
