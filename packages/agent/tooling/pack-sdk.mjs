import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  cpSync,
  copyFileSync,
  constants,
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
import { checkManifest, findNpmCli, pinnedEnvironment, readPin, resolvePinnedBun } from '../bin/bun.mjs';
import { assertRuntimePackageExports, runtimeExecutableInventory } from './maintained-source-inventory.ts';
import { resourceDirectory } from '../bin/standalone-resources.mjs';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import {
  cleanupOwnedWorkspace,
  ownedDirectoryIdentity,
  ownedTempWorkspace,
  removeOwnedDirectory,
} from './owned-staging.ts';
/** @typedef {Record<string, unknown> & { name: string; version: string; files: string[]; scripts: Record<string, unknown>; exports: unknown; main: string; types: string; engines: Record<string, unknown> & { node: string }; dependencies: Record<string, string> }} PackageManifest */
/** @typedef {{ path: string }} NpmPackFile */
/** @typedef {{ name: string; version: string; filename: string; integrity: string; files: NpmPackFile[] }} NpmPackEntry */
/** @typedef {typeof import('tar')} TarModule */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function record(value, label) {
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

/** @param {Record<string, unknown>} value @param {string} key @param {string} label @returns {string} */
function stringProperty(value, key, label) {
  const property = value[key];
  if (typeof property !== 'string') throw new Error(`${label}.${key} must be a string`);
  return property;
}

/** @param {unknown} value @param {string} label @returns {string[]} */
function stringArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result = [];
  for (const entry of value) {
    if (typeof entry !== 'string') throw new Error(`${label} entries must be strings`);
    result.push(entry);
  }
  return result;
}

/** @param {unknown} value @param {string} label @returns {Record<string, string>} */
function stringRecord(value, label) {
  const input = record(value, label);
  /** @type {Record<string, string>} */
  const result = {};
  for (const [key, entry] of Object.entries(input)) {
    if (typeof entry !== 'string') throw new Error(`${label}.${key} must be a string`);
    result[key] = entry;
  }
  return result;
}

/** @param {string} text @param {string} label @returns {PackageManifest} */
function packageManifest(text, label) {
  /** @type {unknown} */
  const parsed = JSON.parse(text);
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
    engines: { ...engines, node: stringProperty(engines, 'node', `${label}.engines`) },
    dependencies: stringRecord(value.dependencies, `${label}.dependencies`),
  };
}

/** @param {unknown} value @returns {value is TarModule} */
function isTarModule(value) {
  return isRecord(value) && 't' in value && typeof value.t === 'function';
}

/** @param {string} relative @returns {string} */
function firstPathSegment(relative) {
  const separator = relative.indexOf('/');
  return separator < 0 ? relative : relative.slice(0, separator);
}

/** @param {unknown} value @returns {TarModule} */
function loadTarModule(value) {
  if (!isTarModule(value)) throw new Error('npm tar package does not expose its public list command');
  return value;
}

/** @param {{ archive: string; root: string; manifestBytes: Buffer; entry: NpmPackEntry; tar: TarModule }} input */
async function verifySdkArchive({ archive, root, manifestBytes, entry, tar }) {
  const listed = new Set(entry.files.map((file) => file.path));
  const observed = new Set();
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
      /** @type {Buffer[]} */
      const chunks = [];
      item.on('data', (chunk) => chunks.push(chunk));
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

/** @param {string} archive @param {{ readonly dev: bigint; readonly ino: bigint }} identity */
function assertSameExistingArchive(archive, identity) {
  const current = lstatSync(archive, { bigint: true });
  assert.ok(
    current.isFile() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino,
    'SDK archive destination changed during retry verification',
  );
}

/** @param {NpmPackEntry[]} entries @returns {NpmPackEntry} */
function firstNpmPackEntry(entries) {
  const entry = entries[0];
  if (entry === undefined) throw new Error('npm pack returned no metadata entry');
  return entry;
}

/** @param {string[]} args @returns {{ root: string; destination: string }} */
function sdkPackArguments(args) {
  if (args.length !== 5 || args[0] !== '--pack' || args[1] !== '--root' || args[3] !== '--destination')
    throw new Error('Usage: pack-sdk.mjs --verify | --pack --root ABS --destination ABS');
  const root = args[2];
  const destination = args[4];
  if (root === undefined || destination === undefined) throw new Error('SDK pack paths are missing');
  return { root, destination };
}

/** @param {unknown} value @returns {NpmPackEntry[]} */
function npmPackEntries(value) {
  if (!Array.isArray(value)) throw new Error('npm pack metadata must be an array');
  const result = [];
  for (const entry of value) {
    const metadata = record(entry, 'npm pack metadata entry');
    const files = metadata.files;
    if (!Array.isArray(files)) throw new Error('npm pack metadata files must be an array');
    const paths = [];
    for (const file of files) {
      const item = record(file, 'npm pack metadata file');
      paths.push({ path: stringProperty(item, 'path', 'npm pack metadata file') });
    }
    result.push({
      name: stringProperty(metadata, 'name', 'npm pack metadata entry'),
      version: stringProperty(metadata, 'version', 'npm pack metadata entry'),
      filename: stringProperty(metadata, 'filename', 'npm pack metadata entry'),
      integrity: stringProperty(metadata, 'integrity', 'npm pack metadata entry'),
      files: paths,
    });
  }
  return result;
}

/** @param {string} root @returns {string} */
function absoluteRoot(root) {
  assert.ok(typeof root === 'string' && path.isAbsolute(root), 'SDK package root must be absolute');
  assert.ok(
    lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(),
    'SDK package root must be a real directory',
  );
  return root;
}

/** @param {string} root @returns {PackageManifest} */
function manifestAt(root) {
  return packageManifest(readFileSync(path.join(root, 'package.json'), 'utf8'), 'package manifest');
}

/** @param {{ root: string }} input */
export function sdkCompatibilityManifest({ root }) {
  absoluteRoot(root);
  const value = manifestAt(root);
  assert.equal(value.name, 'vida-agent');
  assert.ok(Array.isArray(value.files));
  value.files = value.files.filter((entry) => !/standalone|release-notes|release-publish/.test(entry));
  for (const name of Object.keys(value.scripts))
    if (/standalone|^test:resources/.test(name)) delete value.scripts[name];
  delete value.bin;
  value.files = [...new Set([...value.files, 'tooling/pack-sdk.mjs', 'tooling/owned-staging.ts'])];
  value.files.push('!tests/standalone.test.mjs');
  value.scripts.prepack = 'node bin/bun.mjs tooling/pack-sdk.mjs --verify';
  value.scripts['prepack:pinned'] = 'bun tooling/pack-sdk.mjs --verify';
  return { value, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') };
}

/** @param {string} command @param {string[]} args @param {string} root @param {NodeJS.ProcessEnv} [env] @returns {string} */
function run(command, args, root, env = process.env) {
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

/** @param {string} root @returns {{ node: string; bun: string; env: NodeJS.ProcessEnv }} */
function tools(root) {
  const node = process.versions.bun ? run('node', ['-p', 'process.execPath'], root).trim() : process.execPath;
  const bun = resolvePinnedBun({ root, node });
  return { node, bun, env: pinnedEnvironment(bun, process.env, root) };
}

/** @param {string} root @param {string} relative @returns {Buffer} */
function regular(root, relative) {
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

/** @param {{ root: string }} input */
export async function verifySdkPackage({ root }) {
  absoluteRoot(root);
  const manifest = sdkCompatibilityManifest({ root }).value;
  const pin = readPin(root);
  checkManifest(root, pin);
  assertRuntimePackageExports(root);
  for (const relative of runtimeExecutableInventory(root, 'dist')) regular(root, relative);
  /** @param {unknown} value @returns {string[]} */
  const targets = (value) =>
    typeof value === 'string' ? [value] : isRecord(value) ? Object.values(value).flatMap(targets) : [];
  assert.equal(manifest.bin, undefined, 'SDK libraries must not register public CLI commands');
  for (const relative of [...targets(manifest.exports), manifest.main, manifest.types]) {
    assert.ok(regular(root, relative).length > 0, `SDK public target is empty: ${relative}`);
  }
  const declarations = new Set();
  /** @param {string} relative */
  function verifyDeclaration(relative) {
    if (declarations.has(relative)) return;
    declarations.add(relative);
    const text = regular(root, relative).toString('utf8');
    assert.ok(
      !/export\s+(?:declare\s+)?function\s+(?:createTest\w*|\w*ForTests)\b/.test(text),
      'SDK declaration exposes a test issuer',
    );
    for (const match of text.matchAll(/(?:from\s*|import\s*\()['"](\.[^'"]+)['"]/g)) {
      const specifier = String(match[1]);
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), specifier.replace(/\.js$/, '.d.ts')),
      );
      verifyDeclaration(target);
    }
  }
  for (const relative of targets(manifest.exports).filter((entry) => entry.endsWith('.d.ts'))) {
    verifyDeclaration(relative.replace(/^\.\//, ''));
  }
  for (const entry of manifest.files) {
    if (entry.startsWith('!') || entry.startsWith('dist/standalone/')) continue;
    if (!entry.includes('*')) regular(root, entry);
  }
  for (const directory of ['schemas', 'templates', 'instructions']) {
    assert.ok(readdirSync(path.join(root, directory)).length > 0, `SDK resource directory is empty: ${directory}`);
  }
  for (const file of [
    'AGENTS.template.md',
    'AGENT.sidecar.template.md',
    'agent-runtime.config.template.v1.yaml',
    'documentation-policy.template.v1.json',
  ]) {
    assert.ok(regular(root, 'templates/' + file).length > 0, `SDK template is empty: ${file}`);
  }
  for (const file of readdirSync(path.join(root, 'schemas')).filter((entry) => entry.endsWith('.json'))) {
    assert.deepEqual(
      regular(root, 'dist/schemas/' + file),
      regular(root, 'schemas/' + file),
      `SDK schema copy differs: ${file}`,
    );
  }
  assert.deepEqual(
    regular(root, 'dist/portable/bun.lock'),
    regular(root, 'bun.lock'),
    'SDK portable frozen lock differs',
  );
  const { node, bun, env } = tools(root);
  run(bun, ['run', 'preflight:pinned'], root, env);
  run(
    bun,
    [
      '-e',
      `import assert from 'node:assert/strict'; const lock=Bun.JSONC.parse(await Bun.file('bun.lock').text()); const manifest=await Bun.file('package.json').json(); assert.deepEqual(lock.workspaces[''].dependencies,manifest.dependencies); assert.deepEqual(lock.workspaces[''].devDependencies,manifest.devDependencies); for(const [name,version] of Object.entries(manifest.dependencies)){const installed=await Bun.file('node_modules/'+name+'/package.json').json();assert.equal(installed.version,version,'frozen dependency '+name)}; for(const name of ['index','trusted-host']){const source=await Bun.file('src/'+name+'.ts').text();const expected=new Bun.Transpiler({loader:'ts'}).scan(source).exports.sort();const actual=await import('./dist/src/'+name+'.js'); assert.deepEqual(Object.keys(actual).sort(),expected);assert.ok(Object.keys(actual).every(key=>!/^createTest|TestIssuer|ForTests/.test(key)))};`,
    ],
    root,
    env,
  );
  assert.equal(
    run(node, [findNpmCli(node), '--version'], root, env)
      .trim()
      .split('.')[0],
    '11',
    'SDK packaging requires supported npm 11',
  );
  assert.equal(
    run(node, ['--version'], root, env).trim(),
    'v' + manifest.engines.node,
    'SDK packaging requires pinned Node',
  );
}

/** @param {{ root: string; destination: string }} input */
export function packSdkCompatibility(input) {
  return packSdkCompatibilityOperation(input);
}

/** @param {{ root: string; destination: string }} input */
async function packSdkCompatibilityOperation({ root, destination }) {
  absoluteRoot(root);
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
  const temporaryWorkspace = ownedTempWorkspace('vida-sdk-pack-');
  const temporary = temporaryWorkspace.dir;
  const stage = path.join(temporary, 'package');
  const archiveDirectory = path.join(temporary, 'archives');
  const excluded = new Set(['node_modules', '.git', '.tmp', '.agent', '.pack-inspect', 'coverage']);
  /** @type {string | undefined} */
  let publication;
  /** @type {{ dev: bigint; ino: bigint } | undefined} */
  let publicationIdentity;
  /** @type {{ error: unknown } | undefined} */
  let primaryFailure;
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
    const { node, env } = tools(stage);
    const npm = findNpmCli(node);
    assert.equal(
      run(node, [npm, 'config', 'get', 'ignore-scripts'], stage, env).trim(),
      'false',
      'SDK npm lifecycle scripts must be enabled',
    );
    const expected = path.join(archiveDirectory, finalName);
    // The owned prepack runs SDK verification once. Keep it explicitly enabled and verify the exact archive below.
    /** @type {unknown} */
    const metadataValue = JSON.parse(
      run(node, [npm, 'pack', '--json', '--ignore-scripts=false', '--pack-destination', archiveDirectory], stage, env),
    );
    const metadata = npmPackEntries(metadataValue);
    assert.equal(metadata.length, 1);
    const entry = firstNpmPackEntry(metadata);
    assert.equal(entry.name, manifest.value.name);
    assert.equal(entry.version, manifest.value.version);
    assert.equal(entry.filename, path.basename(expected));
    assert.equal(
      entry.integrity,
      'sha512-' + createHash('sha512').update(regular(archiveDirectory, entry.filename)).digest('base64'),
    );
    const verifiedArchive = regular(archiveDirectory, entry.filename);
    const listed = new Set(entry.files.map((file) => file.path));
    assert.ok(listed.has('tooling/pack-sdk.mjs'));
    assert.ok(listed.has('tooling/owned-staging.ts'));
    /** @type {unknown} */
    const tarValue = createRequire(import.meta.url)('tar');
    const tar = loadTarModule(tarValue);
    await verifySdkArchive({ archive: expected, root, manifestBytes: manifest.bytes, entry, tar });
    assert.ok(listed.has('dist/src/index.js') && listed.has('dist/src/trusted-host.d.ts'));
    if (existingArchive !== undefined) {
      const existingIdentity = { dev: existingArchive.dev, ino: existingArchive.ino };
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
  } catch (error) {
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
