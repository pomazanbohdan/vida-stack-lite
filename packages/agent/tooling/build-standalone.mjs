import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPin, checkManifest } from '../bin/bun.mjs';
import { runtimeExecutableInventory } from './maintained-source-inventory.mjs';
import { resourceDigest, resourceDirectory, resourceEntryExists, readResource } from '../bin/standalone-resources.mjs';

const targetName = () => 'bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch;
const manifestName = 'manifest.json';
function sourceInputs(root) {
  const files = new Set([
    ...runtimeExecutableInventory(root, 'dist'),
    '.bun-version',
    'bun.lock',
    'bunfig.toml',
    'tooling/build-standalone.mjs',
    'tooling/pack-sdk.mjs',
  ]);
  const visit = (relative) => {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink(), 'Standalone source link forbidden');
      const name = relative + '/' + entry.name;
      if (entry.isDirectory()) visit(name);
      else {
        assert.ok(entry.isFile());
        files.add(name);
      }
    }
  };
  for (const directory of ['instructions', 'templates', 'schemas']) visit(directory);
  return [...files].sort().map((relative) => {
    const bytes = readResource(root, relative);
    return { path: relative, bytes: bytes.length, sha256: resourceDigest(bytes) };
  });
}

export async function writeStandalonePayload(file, payload) {
  const bytes = await new Bun.Archive(payload, { compress: 'gzip' }).bytes();
  assert.ok(bytes[0] === 0x1f && bytes[1] === 0x8b, 'Standalone payload must be gzip');
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
}

export function standaloneEntrySource({ root, index, payloadId, version }) {
  const entry = path.join(root, 'bin/standalone.mjs').replaceAll('\\', '/');
  return `import payload from './payload.tar.gz' with {type:'file'}; import {runStandalone} from ${JSON.stringify(entry)}; await runStandalone({payload,index:${JSON.stringify(index)},payloadId:${JSON.stringify(payloadId)},version:${JSON.stringify(version)}});`;
}

export async function verifyStandalone({ root }) {
  resourceDirectory(root);
  assert.equal(Bun.version, readPin(root));
  checkManifest(root, Bun.version);
  const folder = path.join(root, 'dist/standalone'),
    manifestPath = path.join(folder, manifestName);
  const manifest = JSON.parse(readResource(folder, manifestName));
  assert.equal(manifest.schema, 'VidaStandaloneBuild/v1');
  assert.equal(manifest.version, JSON.parse(readResource(root, 'package.json')).version);
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
  const inputs = sourceInputs(root),
    manifest = JSON.parse(readResource(root, 'package.json'));
  const stage = mkdtempSync(path.join(tmpdir(), 'vida-native-build-'));
  writeFileSync(path.join(stage, 'package.json'), readResource(root, 'package.json'));
  writeFileSync(path.join(stage, 'bun.lock'), readResource(root, 'bun.lock'));
  writeFileSync(path.join(stage, 'bunfig.toml'), readResource(root, 'bunfig.toml'));
  const env = { ...process.env };
  for (const name of Object.keys(env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'].includes(
        name.toUpperCase(),
      )
    )
      delete env[name];
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
    { cwd: stage, env, encoding: 'utf8', windowsHide: true, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const payload = Object.create(null),
    entries = [];
  const add = (relative, bytes) => {
    payload[relative] = bytes;
    entries.push({ path: relative, bytes: bytes.length, sha256: resourceDigest(bytes) });
  };
  for (const input of inputs.filter(
    (entry) => !entry.path.startsWith('tooling/build-standalone') && !entry.path.startsWith('tooling/pack-sdk'),
  ))
    add(input.path, readResource(root, input.path));
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
      JSON.parse(readResource(stage, 'node_modules/' + name + '/package.json')).version,
      version,
      'Frozen production dependency differs',
    );
  const payloadId = resourceDigest(JSON.stringify(entries)),
    payloadPath = path.join(stage, 'payload.tar.gz');
  const sortedPayload = Object.fromEntries(entries.map((entry) => [entry.path, payload[entry.path]]));
  await writeStandalonePayload(payloadPath, sortedPayload);
  const entry = path.join(stage, 'entry.mjs');
  writeFileSync(entry, standaloneEntrySource({ root, index: entries, payloadId, version: manifest.version }));
  const output = path.join(stage, 'output');
  mkdirSync(output);
  const file = 'vida-agent-' + targetName() + (process.platform === 'win32' ? '.exe' : '');
  const built = await Bun.build({
    entrypoints: [entry],
    target: 'bun',
    format: 'esm',
    env: 'disable',
    bytecode: true,
    minify: { whitespace: true, syntax: true, identifiers: false },
    keepNames: true,
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
  resourceDirectory(path.dirname(destination));
  assert.ok(!resourceEntryExists(destination), 'Standalone output appeared during build');
  // Build staging can be on another volume. Copy files exclusively into an owned sibling, then publish once.
  const publication = mkdtempSync(path.join(path.dirname(destination), '.standalone-pending-'));
  for (const name of [file, manifestName])
    writeFileSync(path.join(publication, name), readResource(output, name), {
      flag: 'wx',
      mode: name === file ? 0o755 : 0o600,
    });
  assert.ok(!resourceEntryExists(destination), 'Standalone output conflict');
  renameSync(publication, destination);
  return verifyStandalone({ root });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(
    [3, 4].includes(process.argv.length) &&
      ['--build', '--verify'].includes(process.argv[2]) &&
      (process.argv.length === 3 || process.argv[3] === '--quiet'),
    'Usage: build-standalone.mjs --build|--verify',
  );
  const root = path.resolve(import.meta.dirname, '..');
  const result = await (process.argv[2] === '--build' ? buildStandalone({ root }) : verifyStandalone({ root }));
  if (process.argv[3] !== '--quiet') console.log(JSON.stringify(result));
}
