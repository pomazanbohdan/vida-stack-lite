import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkManifest, findNpmCli, pinnedEnvironment, readPin, resolvePinnedBun } from '../bin/bun.mjs';
import { assertRuntimePackageExports, runtimeExecutableInventory } from './maintained-source-inventory.mjs';

function absoluteRoot(root) {
  assert.ok(typeof root === 'string' && path.isAbsolute(root), 'SDK package root must be absolute');
  assert.ok(
    lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(),
    'SDK package root must be a real directory',
  );
  return root;
}

function manifestAt(root) {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
}

export function sdkCompatibilityManifest({ root }) {
  absoluteRoot(root);
  const value = manifestAt(root);
  assert.equal(value.name, 'vida-agent');
  assert.ok(Array.isArray(value.files));
  value.files = value.files.filter((entry) => !/standalone|release-notes|release-publish/.test(entry));
  for (const name of Object.keys(value.scripts))
    if (/standalone|^test:resources/.test(name)) delete value.scripts[name];
  delete value.bin;
  if (!value.files.includes('tooling/pack-sdk.mjs')) value.files.push('tooling/pack-sdk.mjs');
  value.files.push('!tests/standalone.test.mjs');
  value.scripts.prepack = 'node bin/bun.mjs tooling/pack-sdk.mjs --verify';
  value.scripts['prepack:pinned'] = 'bun tooling/pack-sdk.mjs --verify';
  return { value, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') };
}

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

function tools(root) {
  const node = process.versions.bun ? run('node', ['-p', 'process.execPath'], root).trim() : process.execPath;
  const bun = resolvePinnedBun({ root, node });
  return { node, bun, env: pinnedEnvironment(bun, process.env, root) };
}

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

export async function verifySdkPackage({ root }) {
  absoluteRoot(root);
  const manifest = sdkCompatibilityManifest({ root }).value;
  const pin = readPin(root);
  checkManifest(root, pin);
  assertRuntimePackageExports(root);
  for (const relative of runtimeExecutableInventory(root, 'dist')) regular(root, relative);
  const targets = (value) => (typeof value === 'string' ? [value] : Object.values(value ?? {}).flatMap(targets));
  assert.equal(manifest.bin, undefined, 'SDK libraries must not register public CLI commands');
  for (const relative of [...targets(manifest.exports), manifest.main, manifest.types]) {
    assert.ok(regular(root, relative).length > 0, `SDK public target is empty: ${relative}`);
  }
  const declarations = new Set();
  function verifyDeclaration(relative) {
    if (declarations.has(relative)) return;
    declarations.add(relative);
    const text = regular(root, relative).toString('utf8');
    assert.ok(
      !/export\s+(?:declare\s+)?function\s+(?:createTest\w*|\w*ForTests)\b/.test(text),
      'SDK declaration exposes a test issuer',
    );
    for (const match of text.matchAll(/(?:from\s*|import\s*\()['"](\.[^'"]+)['"]/g)) {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), match[1].replace(/\.js$/, '.d.ts')),
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

export async function packSdkCompatibility({ root, destination }) {
  absoluteRoot(root);
  assert.ok(
    typeof destination === 'string' && path.isAbsolute(destination),
    'SDK archive destination must be absolute',
  );
  const manifest = sdkCompatibilityManifest({ root });
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'vida-sdk-pack-'));
  const stage = path.join(temporary, 'package');
  const excluded = new Set(['node_modules', '.git', '.tmp', '.agent', '.pack-inspect', 'coverage']);
  try {
    cpSync(root, stage, {
      recursive: true,
      filter(source) {
        const relative = path.relative(root, source).replaceAll('\\', '/');
        if (
          excluded.has(relative.split('/')[0]) ||
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
    mkdirSync(destination, { recursive: true });
    const expected = path.join(destination, `vida-agent-${manifest.value.version}.tgz`);
    assert.ok(!existsSync(expected), 'SDK archive destination already exists');
    // The owned prepack runs SDK verification once. Keep it explicitly enabled and verify the exact archive below.
    const metadata = JSON.parse(
      run(node, [npm, 'pack', '--json', '--ignore-scripts=false', '--pack-destination', destination], stage, env),
    );
    assert.equal(metadata.length, 1);
    const entry = metadata[0];
    assert.equal(entry.name, manifest.value.name);
    assert.equal(entry.version, manifest.value.version);
    assert.equal(entry.filename, path.basename(expected));
    assert.equal(
      entry.integrity,
      'sha512-' + createHash('sha512').update(regular(destination, entry.filename)).digest('base64'),
    );
    const listed = new Set(entry.files.map((file) => file.path));
    assert.ok(listed.has('tooling/pack-sdk.mjs'));
    const observed = new Set();
    const tar = createRequire(npm)('tar');
    await tar.t({
      file: expected,
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
        const chunks = [];
        item.on('data', (chunk) => chunks.push(chunk));
        item.on('end', () =>
          assert.deepEqual(
            Buffer.concat(chunks),
            relative === 'package.json' ? manifest.bytes : regular(root, relative),
            `SDK archive bytes differ: ${relative}`,
          ),
        );
      },
    });
    assert.equal(observed.size, listed.size);
    assert.ok(observed.has('dist/src/index.js') && observed.has('dist/src/trusted-host.d.ts'));
    return { archive: expected, metadata, manifest };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--verify') {
    await verifySdkPackage({ root: path.resolve(import.meta.dirname, '..') });
  } else {
    assert.ok(
      args.length === 5 && args[0] === '--pack' && args[1] === '--root' && args[3] === '--destination',
      'Usage: pack-sdk.mjs --verify | --pack --root ABS --destination ABS',
    );
    const result = await packSdkCompatibility({ root: args[2], destination: args[4] });
    process.stdout.write(JSON.stringify(result.metadata) + '\n');
  }
}
