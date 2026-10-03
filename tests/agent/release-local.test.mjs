import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
  existsSync,
  statSync,
  chmodSync,
  unlinkSync,
  linkSync,
  symlinkSync,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  candidateVersion,
  executeRelease,
  prepareRelease,
  prepareSystemUpdate,
  selectedTarball,
  packedDistribution,
  withReleaseAdmission,
  parsePackOutput,
  reserveReleaseWorker,
  claimReleaseWorker,
  nativeInstallationPaths,
  publishNativeExecutable,
  runCommand,
} from '../../tooling/agent/release-local.mjs';
import { findNpmCli, resolvePinnedBun, standaloneRuntime } from '../../packages/agent/bin/bun.mjs';
import { verifyForwardReviewSet } from '../../tooling/agent/controllers/forward-review-proof.mjs';
import { releaseSourceBinding, testInputBinding } from '../../tooling/agent/release-assurance.mjs';

const json = (value) => JSON.stringify(value);
test('embedded launcher rejects forged Node markers and strips hostile options from its pinned Bun child boundary', () => {
  const packageRoot = path.resolve(import.meta.dirname, '../../packages/agent');
  assert.throws(
    () =>
      standaloneRuntime({
        VIDA_STANDALONE_ROOT: packageRoot,
        VIDA_STANDALONE_EXECUTABLE: process.execPath,
        BUN_BE_BUN: '1',
      }),
    /markers do not match/,
  );
  const executable = resolvePinnedBun({ root: packageRoot });
  const module = new URL('../../packages/agent/bin/bun.mjs', import.meta.url).href;
  const program = `import {runPinnedBun} from ${JSON.stringify(module)};
    const root=${JSON.stringify(packageRoot)};
    const env={...process.env,BUN_BE_BUN:'1',VIDA_STANDALONE_ROOT:root,VIDA_STANDALONE_EXECUTABLE:process.execPath,
      NODE_OPTIONS:'--require=hostile-caller',BUN_OPTIONS:'--preload=hostile-caller'};
    runPinnedBun(['-e','true'],{root,env,spawn(command,args,options){
      console.log(JSON.stringify({command,args,node:options.env.NODE_OPTIONS ?? null,bun:options.env.BUN_OPTIONS ?? null,embedded:options.env.BUN_BE_BUN}));
      return {status:0};}});`;
  const result = spawnSync(
    executable,
    ['--no-env-file', '--no-install', '--config=' + path.join(packageRoot, 'bunfig.toml'), '-e', program],
    { encoding: 'utf8', windowsHide: true, timeout: 30000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout);
  assert.deepEqual(observed.args.slice(0, 3), [
    '--no-env-file',
    '--no-install',
    '--config=' + path.join(packageRoot, 'bunfig.toml'),
  ]);
  assert.equal(observed.node, null);
  assert.equal(observed.bun, null);
  assert.equal(observed.embedded, '1');
});
test('release bindings ignore only exact operational scratch and retain nested cache-named sources', () => {
  const root = releaseBindingFixture();
  try {
    const initial = releaseSourceBinding(root).source_binding,
      initialPackageBinding = testInputBinding(root, ['packages/agent']);
    mkdirSync(path.join(root, '.tmp/vida-bun-cache'), { recursive: true });
    mkdirSync(path.join(root, '.tmp/releases/stage'), { recursive: true });
    mkdirSync(path.join(root, '.agent/work'), { recursive: true });
    mkdirSync(path.join(root, 'packages/agent/.tmp/vida-bun-cache'), { recursive: true });
    mkdirSync(path.join(root, 'packages/agent/.agent/work'), { recursive: true });
    const initialOperationalBinding = testInputBinding(root, ['.agent', '.tmp']);
    writeFileSync(path.join(root, '.tmp/vida-bun-cache/cache.bin'), 'TEST SETUP cache bytes');
    writeFileSync(path.join(root, '.tmp/releases/stage/archive.tgz'), 'TEST SETUP stage bytes');
    writeFileSync(path.join(root, '.agent/work/observation.json'), 'TEST SETUP operation bytes');
    writeFileSync(path.join(root, 'packages/agent/.tmp/vida-bun-cache/cache.bin'), 'TEST SETUP package cache bytes');
    writeFileSync(path.join(root, 'packages/agent/.agent/work/observation.json'), 'TEST SETUP package operation bytes');
    assert.equal(releaseSourceBinding(root).source_binding, initial);
    assert.equal(testInputBinding(root, ['packages/agent']), initialPackageBinding);
    assert.equal(testInputBinding(root, ['.agent', '.tmp']), initialOperationalBinding);
    mkdirSync(path.join(root, 'packages/agent/src/.tmp'), { recursive: true });
    mkdirSync(path.join(root, 'packages/agent/src/.agent'), { recursive: true });
    mkdirSync(path.join(root, 'packages/agent/src/cache'), { recursive: true });
    writeFileSync(path.join(root, 'packages/agent/src/.tmp/bound.mjs'), 'TEST SETUP maintained tmp source');
    writeFileSync(path.join(root, 'packages/agent/src/.agent/bound.mjs'), 'TEST SETUP maintained agent source');
    writeFileSync(path.join(root, 'packages/agent/src/cache/bound.mjs'), 'TEST SETUP product cache source');
    assert.notEqual(releaseSourceBinding(root).source_binding, initial);
    assert.notEqual(testInputBinding(root, ['packages/agent']), initialPackageBinding);
    if (process.platform === 'win32') {
      symlinkSync(
        path.join(root, 'packages/agent/src/cache'),
        path.join(root, 'packages/agent/src/.tmp/linked-dir'),
        'junction',
      );
    } else {
      symlinkSync(
        path.join(root, 'packages/agent/src/cache/bound.mjs'),
        path.join(root, 'packages/agent/src/.tmp/linked.mjs'),
      );
    }
    assert.throws(() => releaseSourceBinding(root), /linked source/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('native publication rejects linked directories and hardlinked prior executables without changing their owners', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-native-links-'));
  try {
    const bytes = Buffer.from('TEST FIXTURE native bytes'),
      source = path.join(root, 'asset'),
      owner = path.join(root, 'owner');
    writeFileSync(source, bytes);
    writeFileSync(owner, bytes);
    const asset = {
      path: source,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    const destination = path.join(root, 'linked-executable');
    linkSync(owner, destination);
    assert.throws(
      () => publishNativeExecutable(asset, destination, { ...asset, path: destination }),
      /unowned or linked/,
    );
    assert.deepEqual(readFileSync(owner), bytes);
    const ownedFolder = path.join(root, 'owned-folder'),
      linkedFolder = path.join(root, 'linked-folder');
    mkdirSync(ownedFolder);
    symlinkSync(ownedFolder, linkedFolder, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () => publishNativeExecutable(asset, path.join(linkedFolder, 'vida-agent')),
      /directory must not be linked/,
    );
    assert.equal(existsSync(path.join(ownedFolder, 'vida-agent')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('native publication uses exclusive first creation and exact prior-asset CAS without replacing unrelated files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-native-cas-'));
  try {
    const source = path.join(root, 'asset'),
      destination = path.join(root, 'bin', process.platform === 'win32' ? 'vida-agent.exe' : 'vida-agent');
    const asset = (bytes) => {
      writeFileSync(source, bytes);
      return {
        path: source,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    };
    const first = asset(Buffer.from('TEST FIXTURE native bytes first'));
    publishNativeExecutable(first, destination);
    assert.deepEqual(readFileSync(destination), readFileSync(source));
    assert.throws(() => publishNativeExecutable(first, destination), /unowned/);
    const prior = { ...first, path: destination },
      second = asset(Buffer.from('TEST FIXTURE native bytes second'));
    assert.throws(
      () => publishNativeExecutable(second, destination, { ...prior, sha256: '0'.repeat(64) }),
      /Prior native artifact differs/,
    );
    assert.equal(readFileSync(destination, 'utf8'), 'TEST FIXTURE native bytes first');
    publishNativeExecutable(second, destination, prior);
    assert.deepEqual(readFileSync(destination), readFileSync(source));
    writeFileSync(source, 'TEST FIXTURE tampered asset');
    assert.throws(
      () => publishNativeExecutable(second, destination, { ...second, path: destination }),
      /source asset differs/,
    );
    assert.equal(readFileSync(destination, 'utf8'), 'TEST FIXTURE native bytes second');
    assert.throws(
      () =>
        nativeInstallationPaths({
          version: '0.1.2',
          operation: 'local-test',
          target: 'bun-foreign-x64',
          env: {},
        }),
      /target differs/,
    );
    const locations = nativeInstallationPaths({
      version: '0.1.2',
      operation: 'local-test',
      target: 'bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch,
      env: { LOCALAPPDATA: root, XDG_DATA_HOME: root },
    });
    assert.ok(locations.installed_root.includes('0.1.2-local-test'));
    assert.equal(path.dirname(locations.path_command), locations.prefix);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
function admissionChild(root, name, mode = 'hold') {
  const module = new URL('../../tooling/agent/release-local.mjs', import.meta.url).href;
  const code = `import { withReleaseAdmission, prepareRelease, prepareSystemUpdate } from ${JSON.stringify(module)};
    import { existsSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    const root=process.argv[1], name=process.argv[2], mode=process.argv[3];
    writeFileSync(path.join(root,name+'-attempt'), 'TEST SETUP attempted');
    if(mode==='prepare') console.log(JSON.stringify(await prepareRelease(root)));
    else if(mode==='system-update') console.log(JSON.stringify(await prepareSystemUpdate(root)));
    else await withReleaseAdmission(root,()=>{
      writeFileSync(path.join(root,name+'-entered'),'TEST SETUP entered');
      const deadline=Date.now()+15000;
      while(!existsSync(path.join(root,name+'-release'))){
        if(Date.now()>deadline)throw new Error('TEST SETUP hold deadline');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
      }
    });`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', code, root, name, mode], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '',
    stderr = '',
    finished = false;
  child.stdout.on('data', (bytes) => {
    stdout += bytes;
  });
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => {
      finished = true;
      resolve({ code, signal, stdout, stderr });
    });
  });
  const marker = async (phase) => {
    const deadline = Date.now() + 10000;
    while (!existsSync(path.join(root, name + '-' + phase))) {
      if (finished || Date.now() > deadline)
        throw new Error('Child marker missing: ' + name + '-' + phase + ' ' + stderr);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  return { child, completion, marker };
}
function workerChild(root, operation, name) {
  const module = new URL('../../tooling/agent/release-local.mjs', import.meta.url).href;
  const code = `import { claimReleaseWorker } from ${JSON.stringify(module)};
    import { existsSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    const [root,operation,name]=process.argv.slice(1);
    const wait=async(phase)=>{const deadline=Date.now()+10000;
      while(!existsSync(path.join(root,name+'-'+phase))){
        if(Date.now()>deadline)throw new Error('TEST SETUP deadline');
        await new Promise(resolve=>setTimeout(resolve,10));
      }};
    writeFileSync(path.join(root,name+'-attempt'),'TEST SETUP');
    await wait('start');
    const mutex=await claimReleaseWorker(root,operation,process.pid);
    try { writeFileSync(path.join(root,name+'-entered'),'TEST SETUP'); await wait('release'); }
    finally {mutex.close();}`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', code, root, operation, name], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stderr }));
  });
  const marker = async (phase) => {
    const deadline = Date.now() + 10000;
    while (!existsSync(path.join(root, name + '-' + phase))) {
      if (Date.now() > deadline) throw new Error('TEST SETUP child marker missing ' + stderr);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  return { child, completion, marker };
}
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida local Україна '));
  const source = path.join(root, 'packages/agent');
  mkdirSync(path.join(source, 'bin'), { recursive: true });
  mkdirSync(path.join(source, 'instructions'));
  writeFileSync(
    path.join(source, 'package.json'),
    json({
      name: 'vida-agent',
      version: '0.1.0',
      bin: { 'vida-agent': './bin/vida-agent.mjs' },
      engines: { bun: '1.4.2' },
      packageManager: 'bun@1.4.2',
    }),
  );
  writeFileSync(path.join(source, 'bin/vida-agent.mjs'), '// TEST SETUP fake package');
  writeFileSync(path.join(source, 'instructions/development-lifecycle.md'), 'TEST SETUP');
  const prefix = path.join(root, 'global prefix'),
    globalRoot = path.join(prefix, 'node_modules');
  mkdirSync(globalRoot, { recursive: true });
  const shimFolder = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
  mkdirSync(shimFolder, { recursive: true });
  const calls = [],
    executions = [],
    npmCli = path.join(root, 'npm-cli.js');
  const command = async (executable, args, options = {}) => {
    calls.push(args);
    executions.push({ executable, args: [...args], cwd: options.cwd });
    let action, actionArgs;
    if (process.platform === 'win32' && args[0] === '/d' && args[1] === '/s' && args[2] === '/c') {
      const commandLine = args[3] ?? '';
      action = ['version', 'instructions', 'install'].find((candidate) => commandLine.includes(`"${candidate}"`));
      actionArgs = action === 'install' ? ['--check'] : [];
    } else {
      const npmInvocation = args[0] === npmCli;
      actionArgs = npmInvocation ? args.slice(2) : args.slice(1);
      action = npmInvocation ? args[1] : args[0];
    }
    if (action === 'pack') {
      const folder = args.at(-1),
        version = JSON.parse(readFileSync(path.join(source, 'package.json'))).version;
      const bytes = Buffer.from('TEST SETUP tarball ' + version),
        filename = `vida-agent-${version}.tgz`;
      writeFileSync(path.join(folder, filename), bytes);
      return json([
        {
          name: 'vida-agent',
          version,
          filename,
          integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
          files: [
            { path: 'package.json' },
            { path: 'bin/vida-agent.mjs' },
            { path: 'instructions/development-lifecycle.md' },
          ],
        },
      ]);
    }
    if (action === 'prefix') return prefix;
    if (action === 'root') return globalRoot;
    if (action === 'install' && actionArgs[0] === '--global') {
      const installed = path.join(globalRoot, 'vida-agent');
      rmSync(installed, { recursive: true, force: true });
      cpSync(source, path.join(globalRoot, 'vida-agent'), { recursive: true });
      if (process.platform === 'win32')
        writeFileSync(
          path.join(prefix, 'vida-agent.cmd'),
          '@echo off\r\nnode "%~dp0node_modules\\vida-agent\\bin\\vida-agent.mjs" %*\r\n',
        );
      else {
        const { symlinkSync } = await import('node:fs');
        symlinkSync(path.join(globalRoot, 'vida-agent/bin/vida-agent.mjs'), path.join(prefix, 'bin/vida-agent'));
      }
      return '';
    }
    const version = JSON.parse(readFileSync(path.join(source, 'package.json'))).version;
    if (action === 'version') return json({ name: 'vida-agent', version });
    if (action === 'instructions')
      return json({
        version,
        path: path.join(globalRoot, 'vida-agent/instructions/development-lifecycle.md'),
      });
    if (action === 'install' && actionArgs[0] === '--check')
      return json({ status: 'prerequisites_valid', bun_pin: '1.4.2' });
    throw new Error('Unexpected TEST SETUP command: ' + args.join(' '));
  };
  return {
    root,
    prefix,
    source,
    calls,
    executions,
    command,
    env: { PATH: shimFolder },
    qualify: async () => ({ source_binding: 'TEST SETUP exact source binding' }),
    npmCli,
  };
}
function releaseBindingFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida release binding ')),
    repository = path.resolve(import.meta.dirname, '../..');
  for (const relative of [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'packages/agent',
    'tooling/agent/release-local.mjs',
    'tooling/agent/release-assurance.mjs',
    'tooling/agent/controllers/forward-review-proof.mjs',
    'tests/agent/release-local.test.mjs',
  ]) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(repository, relative), destination, { recursive: true, dereference: false });
  }
  return root;
}
async function npmCompatibility(value, { failCheck = false, installMutation } = {}) {
  const pkg = JSON.parse(readFileSync(path.join(value.source, 'package.json')));
  pkg.files = ['bin/vida-agent.mjs', 'instructions/**'];
  pkg.scripts = { prepack: 'node bin/bun.mjs tooling/pack-sdk.mjs --verify' };
  writeFileSync(path.join(value.source, 'package.json'), json(pkg));
  mkdirSync(path.join(value.source, 'tooling'));
  writeFileSync(path.join(value.source, 'tooling/pack-sdk.mjs'), '// TEST SETUP owned helper payload');
  writeFileSync(
    path.join(value.source, 'bin/vida-agent.mjs'),
    `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).version;
const [action,...args]=process.argv.slice(2);
if(action==='version') console.log(JSON.stringify({name:'vida-agent',version}));
else if(action==='instructions') console.log(JSON.stringify({version,path:path.join(root,'instructions/development-lifecycle.md')}));
else if(action==='install' && args[0]==='--check') console.log(JSON.stringify({status:'prerequisites_valid',bun_pin:'1.4.2'}));
else process.exitCode=2;
`,
  );
  chmodSync(path.join(value.source, 'bin/vida-agent.mjs'), 0o755);
  const { sdkCompatibilityManifest } = await import('../../packages/agent/tooling/pack-sdk.mjs');
  const npmCli = findNpmCli(),
    tar = createRequire(npmCli)('tar'),
    packSdk = path.join(value.source, 'tooling/pack-sdk.mjs'),
    installed = path.join(value.prefix, 'node_modules/vida-agent'),
    expectedShim =
      process.platform === 'win32'
        ? path.join(value.prefix, 'vida-agent.cmd')
        : path.join(value.prefix, 'bin/vida-agent'),
    env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = [value.env.PATH, process.env.PATH].filter(Boolean).join(path.delimiter);
  const state = { archive: undefined, failCheck, installMutation, installs: 0, cliInvocations: [] };
  const writeInstalled = (mutation = undefined) => {
    rmSync(installed, { recursive: true, force: true });
    cpSync(value.source, installed, { recursive: true });
    writeFileSync(path.join(installed, 'package.json'), sdkCompatibilityManifest({ root: value.source }).bytes);
    mkdirSync(path.join(installed, 'node_modules/test-owned-dependency'), { recursive: true });
    writeFileSync(path.join(installed, 'node_modules/test-owned-dependency/index.js'), '// TEST SETUP npm dependency');
    if (process.platform === 'win32')
      writeFileSync(expectedShim, '@echo off\r\nnode "%~dp0node_modules\\vida-agent\\bin\\vida-agent.mjs" %*\r\n');
    else {
      rmSync(expectedShim, { force: true });
      symlinkSync(path.join(installed, 'bin/vida-agent.mjs'), expectedShim);
    }
    if (mutation === 'missing') unlinkSync(path.join(installed, 'instructions/development-lifecycle.md'));
    if (mutation === 'changed')
      writeFileSync(path.join(installed, 'bin/vida-agent.mjs'), '// TEST SETUP corrupted installed archive byte');
    if (mutation === 'foreign')
      writeFileSync(path.join(installed, 'foreign-after-install.txt'), 'TEST SETUP unowned npm output');
  };
  const command = async (executable, args, options = {}) => {
    if (args[0] === packSdk) {
      const destination = args[5],
        stage = path.join(value.root, 'sdk-stage'),
        version = JSON.parse(readFileSync(path.join(value.source, 'package.json'))).version,
        files = ['package.json', 'bin/vida-agent.mjs', 'instructions/development-lifecycle.md', 'tooling/pack-sdk.mjs'];
      cpSync(value.source, stage, { recursive: true });
      writeFileSync(path.join(stage, 'package.json'), sdkCompatibilityManifest({ root: value.source }).bytes);
      state.archive = path.join(destination, `vida-agent-${version}.tgz`);
      await tar.c({ gzip: true, cwd: stage, prefix: 'package/', file: state.archive }, files);
      return json([
        {
          name: 'vida-agent',
          version,
          filename: path.basename(state.archive),
          integrity: 'sha512-' + createHash('sha512').update(readFileSync(state.archive)).digest('base64'),
          files: files.map((relative) => ({ path: relative })),
        },
      ]);
    }
    if (args[0] === npmCli && args[1] === 'prefix') return value.prefix;
    if (args[0] === npmCli && args[1] === 'root') return path.join(value.prefix, 'node_modules');
    if (args[0] === npmCli && args[1] === 'install' && args[2] === '--global') {
      assert.equal(args[3], state.archive);
      state.installs++;
      writeInstalled(state.installMutation);
      return '';
    }
    const isWindowsCli =
      process.platform === 'win32' &&
      executable.toLowerCase().endsWith('cmd.exe') &&
      args[0] === '/d' &&
      args[1] === '/s' &&
      args[2] === '/c';
    const isUnixCli = process.platform !== 'win32' && executable === expectedShim;
    if (isWindowsCli || isUnixCli) {
      const commandText = isWindowsCli ? (args[3] ?? '') : args.join(' ');
      state.cliInvocations.push({ executable, args: [...args], cwd: options.cwd, commandText });
      if (state.failCheck && commandText.includes('install') && commandText.includes('--check'))
        throw new Error('TEST SETUP observed install check failure');
      return runCommand(executable, args, options);
    }
    throw new Error('Unexpected TEST SETUP command: ' + [executable, ...args].join(' '));
  };
  const candidate = await prepareRelease(value.root);
  return {
    value,
    candidate,
    npmCli,
    packSdk,
    expectedShim,
    installed,
    env,
    state,
    command,
    writeInstalled,
    args: { ...value, npmCli, command, env, operation: candidate.operation_id, distribution: 'npm' },
  };
}
test('initial candidate 0.1.0 and subsequent successful publications increment patch only', async () => {
  const fixtureValue = fixture();
  try {
    assert.equal(candidateVersion('0.1.0'), '0.1.0');
    const candidate = await prepareRelease(fixtureValue.root);
    assert.equal(candidate.version, '0.1.0');
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const result = await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(result.status, 'successful');
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
    const install = fixtureValue.calls.find((args) => args[1] === 'install' && args[2] === '--global');
    assert.equal(
      install.at(-1),
      path.join(fixtureValue.root, '.tmp/releases', candidate.operation_id, 'vida-agent-0.1.0.tgz'),
    );
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
    assert.ok(fixtureValue.calls.every((args) => !args.includes('publish')));
    rmSync(path.join(fixtureValue.root, '.tmp'), { recursive: true });
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.1');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('same-version system update installs changed exact bytes and preserves an unknown pending operation', async () => {
  const value = fixture();
  try {
    const release = await npmCompatibility(value);
    await executeRelease({ ...release.args, packOnly: true });
    await executeRelease(release.args);
    const manifestBytes = readFileSync(path.join(value.source, 'package.json'));
    const firstArchive = release.state.archive;
    const firstArchiveBytes = readFileSync(firstArchive);
    const changedPath = path.join(value.source, 'instructions/development-lifecycle.md');
    writeFileSync(changedPath, 'TEST SETUP different same-version payload');
    const update = await prepareSystemUpdate(value.root);
    assert.equal(update.version, release.candidate.version);
    assert.notEqual(update.operation_id, release.candidate.operation_id);
    assert.deepEqual(readFileSync(path.join(value.source, 'package.json')), manifestBytes);
    assert.deepEqual(await prepareSystemUpdate(value.root), update);
    const args = { ...release.args, operation: update.operation_id };
    await executeRelease({ ...args, packOnly: true });
    assert.notEqual(release.state.archive, firstArchive);
    assert.notDeepEqual(readFileSync(release.state.archive), firstArchiveBytes);
    release.state.failCheck = true;
    await assert.rejects(executeRelease(args), /observed install check failure/);
    assert.equal(release.state.installs, 2);
    const folder = path.join(value.root, '.agent/work/agent-local-release');
    const journalFile = path.join(folder, update.operation_id, 'release.json');
    const pendingBefore = readFileSync(path.join(folder, 'pending.json'));
    const journalBefore = readFileSync(journalFile);
    const pending = await prepareSystemUpdate(value.root);
    assert.equal(pending.operation_id, update.operation_id);
    assert.equal(pending.status, 'failed');
    assert.equal(pending.install_started, true);
    assert.deepEqual(readFileSync(path.join(folder, 'pending.json')), pendingBefore);
    assert.deepEqual(readFileSync(journalFile), journalBefore);
    assert.equal(release.state.installs, 2);
    const installedPath = path.join(release.installed, 'instructions/development-lifecycle.md');
    writeFileSync(installedPath, 'TEST SETUP uncertain installed bytes');
    await assert.rejects(executeRelease(args), /Prior install outcome differs or remains uncertain/);
    assert.equal(release.state.installs, 2);
    writeFileSync(installedPath, readFileSync(changedPath));
    release.state.failCheck = false;
    assert.equal((await executeRelease(args)).status, 'successful');
    assert.equal(release.state.installs, 2);
    const next = await prepareSystemUpdate(value.root);
    assert.equal(next.version, update.version);
    assert.notEqual(next.operation_id, update.operation_id);
    assert.deepEqual(readFileSync(path.join(value.source, 'package.json')), manifestBytes);
    assert.equal((await prepareRelease(value.root)).operation_id, next.operation_id);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('same-version system update rejects conflicting baseline and pending metadata without rewriting it', async (t) => {
  const cases = [
    ['missing successful baseline', (files) => unlinkSync(files.success)],
    ['missing successful journal', (files) => unlinkSync(files.baselineJournal)],
    ['unsuccessful baseline', (files, change) => change(files.success, { status: 'failed' })],
    [
      'substituted successful journal identity',
      (files, change) => change(files.baselineJournal, { operation_id: 'local-foreign' }),
    ],
    ['substituted successful journal version', (files, change) => change(files.baselineJournal, { version: '0.1.9' })],
    ['unsuccessful baseline journal', (files, change) => change(files.baselineJournal, { status: 'failed' })],
    ['changed manifest version', (files, change) => change(files.manifest, { version: '0.1.9' })],
    ['unsupported manifest', (files, change) => change(files.manifest, { version: '0.2.0' })],
    ['missing pending journal', (files) => unlinkSync(files.pendingJournal)],
    [
      'substituted pending identity',
      (files, change) => change(files.pendingJournal, { operation_id: 'local-foreign' }),
    ],
    ['substituted pending version', (files, change) => change(files.pendingJournal, { version: '0.1.9' })],
    [
      'outstanding patch candidate',
      (files, change) => {
        change(files.manifest, { version: '0.1.1' });
        change(files.pending, { version: '0.1.1' });
        change(files.pendingJournal, { version: '0.1.1' });
      },
    ],
  ];
  for (const [name, mutate] of cases)
    await t.test(name, async () => {
      const value = fixture();
      try {
        const baseline = await prepareRelease(value.root);
        await executeRelease({ ...value, operation: baseline.operation_id, packOnly: true });
        await executeRelease({ ...value, operation: baseline.operation_id });
        const pending = await prepareSystemUpdate(value.root);
        const folder = path.join(value.root, '.agent/work/agent-local-release');
        const files = {
          manifest: path.join(value.source, 'package.json'),
          success: path.join(folder, 'successful.json'),
          baselineJournal: path.join(folder, baseline.operation_id, 'release.json'),
          pending: path.join(folder, 'pending.json'),
          pendingJournal: path.join(folder, pending.operation_id, 'release.json'),
        };
        const change = (file, updates) => writeFileSync(file, json({ ...JSON.parse(readFileSync(file)), ...updates }));
        mutate(files, change);
        const before = Object.values(files).map((file) => (existsSync(file) ? readFileSync(file) : null));
        const installCalls = value.calls.length;
        await assert.rejects(prepareSystemUpdate(value.root));
        Object.values(files).forEach((file, index) =>
          assert.deepEqual(existsSync(file) ? readFileSync(file) : null, before[index]),
        );
        assert.equal(value.calls.length, installCalls);
      } finally {
        rmSync(value.root, { recursive: true, force: true });
      }
    });
});
test('same-version system update reconciles only an exact completed pending installation', async () => {
  const value = fixture();
  try {
    const release = await npmCompatibility(value);
    await executeRelease({ ...release.args, packOnly: true });
    await executeRelease(release.args);
    const folder = path.join(value.root, '.agent/work/agent-local-release');
    const successFile = path.join(folder, 'successful.json');
    unlinkSync(successFile);
    const installedPath = path.join(release.installed, 'instructions/development-lifecycle.md');
    const installedBytes = readFileSync(installedPath);
    writeFileSync(installedPath, 'TEST SETUP drift after completed installation');
    const pendingBefore = readFileSync(path.join(folder, 'pending.json'));
    const journalBefore = readFileSync(path.join(folder, release.candidate.operation_id, 'release.json'));
    await assert.rejects(prepareSystemUpdate(value.root), /must be reconciled against installed bytes/);
    assert.equal(existsSync(successFile), false);
    assert.deepEqual(readFileSync(path.join(folder, 'pending.json')), pendingBefore);
    assert.deepEqual(readFileSync(path.join(folder, release.candidate.operation_id, 'release.json')), journalBefore);
    writeFileSync(installedPath, installedBytes);
    const next = await prepareSystemUpdate(value.root);
    assert.equal(next.version, release.candidate.version);
    assert.notEqual(next.operation_id, release.candidate.operation_id);
    assert.equal(JSON.parse(readFileSync(successFile)).operation_id, release.candidate.operation_id);
    assert.equal(release.state.installs, 1);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('same-version system update preparation has one operation across independent process callers', async () => {
  const value = fixture();
  try {
    const baseline = await prepareRelease(value.root);
    await executeRelease({ ...value, operation: baseline.operation_id, packOnly: true });
    await executeRelease({ ...value, operation: baseline.operation_id });
    const left = admissionChild(value.root, 'system-left', 'system-update');
    const right = admissionChild(value.root, 'system-right', 'system-update');
    const outcomes = await Promise.all([left.completion, right.completion]);
    for (const outcome of outcomes) assert.equal(outcome.code, 0, outcome.stderr);
    const operations = outcomes.map((outcome) => JSON.parse(outcome.stdout));
    assert.equal(operations[0].operation_id, operations[1].operation_id);
    assert.equal(operations[0].version, baseline.version);
    assert.notEqual(operations[0].operation_id, baseline.operation_id);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('missing assurance and failed prepack preserve the pending version without install', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        operation: candidate.operation_id,
        qualify: async () => {
          throw new Error('awaiting_assurance: missing real reviews');
        },
      }),
      /awaiting_assurance/,
    );
    assert.equal(fixtureValue.calls.length, 0);
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        operation: candidate.operation_id,
        packOnly: true,
        command: async () => {
          throw new Error('prepack failed');
        },
      }),
      /prepack failed/,
    );
    assert.deepEqual(await prepareRelease(fixtureValue.root), candidate);
    assert.equal(JSON.parse(readFileSync(path.join(fixtureValue.source, 'package.json'))).version, '0.1.0');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('local release waits for pending qualification before starting package work', async () => {
  const value = fixture();
  try {
    const candidate = await prepareRelease(value.root);
    let releaseQualification,
      qualificationCalls = 0,
      packStarted = false;
    const held = new Promise((resolve) => {
      releaseQualification = resolve;
    });
    const operation = executeRelease({
      ...value,
      operation: candidate.operation_id,
      packOnly: true,
      qualify: async () => {
        if (++qualificationCalls === 1) await held;
        return { source_binding: 'TEST SETUP delayed qualification' };
      },
      command: async (executable, args, options) => {
        if (args[0] === value.npmCli && args[1] === 'pack') packStarted = true;
        return value.command(executable, args, options);
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(packStarted, false);
    releaseQualification();
    await operation;
    assert.equal(packStarted, true);
    assert.equal(qualificationCalls, 2);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('pack metadata refuses multiple archives, traversal and unrelated artifact identity', () => {
  assert.throws(() => selectedTarball([], tmpdir(), '0.1.0'), /exactly one/);
  assert.throws(
    () =>
      selectedTarball(
        [{ name: 'vida-agent', version: '0.1.0', filename: '../vida-agent-0.1.0.tgz' }],
        tmpdir(),
        '0.1.0',
      ),
    /identity differs/,
  );
  assert.throws(
    () => selectedTarball([{ name: 'other', version: '0.1.0', filename: 'vida-agent-0.1.0.tgz' }], tmpdir(), '0.1.0'),
    /identity differs/,
  );
});
test('completed receipt repairs a missing success stamp before allocating the next patch', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    rmSync(path.join(fixtureValue.root, '.agent/work/agent-local-release/successful.json'));
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.1');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('failed admission rolls back its own transaction without removing shared admission or another owner file', async () => {
  const fixtureValue = fixture();
  try {
    await prepareRelease(fixtureValue.root);
    const folder = path.join(fixtureValue.root, '.agent/work/agent-local-release');
    const database = path.join(folder, 'admission.sqlite'),
      otherOwnerFile = path.join(folder, 'admission.json');
    writeFileSync(otherOwnerFile, 'TEST SETUP independent owner bytes');
    const identity = statSync(database).ino;
    await assert.rejects(
      withReleaseAdmission(fixtureValue.root, () => {
        throw new Error('TEST SETUP owner failure');
      }),
      /owner failure/,
    );
    assert.equal(readFileSync(otherOwnerFile, 'utf8'), 'TEST SETUP independent owner bytes');
    assert.equal(statSync(database).ino, identity);
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.0');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('worker mutex recovers unrelated live PIDs, rejects startup losers and releases killed owners without replaying uncertain installs', async () => {
  const value = fixture(),
    children = [];
  try {
    const pending = await prepareRelease(value.root),
      operation = pending.operation_id;
    const journal = path.join(value.root, '.agent/work/agent-local-release', operation, 'release.json');
    await executeRelease({ ...value, operation, packOnly: true });
    // TEST SETUP: a live unrelated process occupies the old numeric reservation.
    writeFileSync(
      journal,
      json({
        ...JSON.parse(readFileSync(journal)),
        pid: process.pid,
        status: 'running',
        install_started: true,
      }),
    );
    const first = workerChild(value.root, operation, 'worker-first');
    children.push(first);
    await first.marker('attempt');
    const reserved = await reserveReleaseWorker(value.root, operation, () => first.child.pid);
    assert.equal(reserved.pid, first.child.pid);
    const second = workerChild(value.root, operation, 'worker-second');
    children.push(second);
    await second.marker('attempt');
    await reserveReleaseWorker(value.root, operation, () => second.child.pid);
    writeFileSync(path.join(value.root, 'worker-first-start'), 'TEST SETUP');
    const loser = await first.completion;
    assert.equal(loser.code, 1);
    assert.match(loser.stderr, /reservation differs/);
    writeFileSync(path.join(value.root, 'worker-second-start'), 'TEST SETUP');
    await second.marker('entered');
    let launched = false;
    const busy = await reserveReleaseWorker(value.root, operation, () => {
      launched = true;
      return process.pid;
    });
    assert.equal(launched, false);
    assert.equal(busy.pid, second.child.pid);
    second.child.kill('SIGKILL');
    await second.completion;
    const recovered = await reserveReleaseWorker(value.root, operation, () => process.pid);
    assert.equal(recovered.pid, process.pid);
    assert.equal(recovered.install_started, true);
    assert.equal((await prepareRelease(value.root)).operation_id, operation);
    const mutex = await claimReleaseWorker(value.root, operation, process.pid);
    try {
      await assert.rejects(executeRelease({ ...value, operation }), /Prior install targets differ or remain uncertain/);
      assert.equal(
        value.calls.some((args) => args.includes('--global') && args.includes('install')),
        false,
      );
    } finally {
      mutex.close();
    }
  } finally {
    for (const child of children) {
      child.child.kill('SIGKILL');
      await child.completion;
    }
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('real process admission stays exclusive across owner handoff and killed-owner rollback', async () => {
  const fixtureValue = fixture(),
    children = [];
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    const database = path.join(fixtureValue.root, '.agent/work/agent-local-release/admission.sqlite');
    const identity = statSync(database).ino;
    const first = admissionChild(fixtureValue.root, 'first');
    children.push(first);
    await first.marker('entered');
    const second = admissionChild(fixtureValue.root, 'second');
    children.push(second);
    await second.marker('attempt');
    writeFileSync(path.join(fixtureValue.root, 'first-release'), 'TEST SETUP release');
    await second.marker('entered');
    assert.equal((await first.completion).code, 0);
    assert.equal(statSync(database).ino, identity);
    const contender = admissionChild(fixtureValue.root, 'contender', 'prepare');
    children.push(contender);
    const denied = await contender.completion;
    assert.notEqual(denied.code, 0);
    assert.match(denied.stderr, /locked|SQLITE_BUSY/);
    second.child.kill('SIGKILL');
    await second.completion;
    const recovered = admissionChild(fixtureValue.root, 'recovered', 'prepare');
    children.push(recovered);
    const result = await recovered.completion;
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).operation_id, candidate.operation_id);
    assert.equal(statSync(database).ino, identity);
    assert.equal(JSON.parse(readFileSync(path.join(fixtureValue.source, 'package.json'))).version, '0.1.0');
  } finally {
    for (const child of children) {
      child.child.kill('SIGKILL');
      await child.completion;
    }
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('verification failure after install resumes exact installed artifact without another install', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const command = async (cmd, args, options) => {
      if (args[0] === 'version' || args[1] === 'version' || args[3]?.includes('"version"'))
        throw new Error('transient version observation failure');
      return fixtureValue.command(cmd, args, options);
    };
    await assert.rejects(
      executeRelease({ ...fixtureValue, command, operation: candidate.operation_id }),
      /observation failure/,
    );
    assert.equal((await prepareRelease(fixtureValue.root)).operation_id, candidate.operation_id);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('scratch removal after an install effect preserves unknown outcome and prevents replay', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const command = async (cmd, args, options) => {
      if (args[0] === 'version' || args[1] === 'version' || args[3]?.includes('"version"'))
        throw new Error('observation interrupted');
      return fixtureValue.command(cmd, args, options);
    };
    await assert.rejects(
      executeRelease({ ...fixtureValue, command, operation: candidate.operation_id }),
      /interrupted/,
    );
    rmSync(path.join(fixtureValue.root, '.tmp'), { recursive: true });
    assert.equal((await prepareRelease(fixtureValue.root)).operation_id, candidate.operation_id);
    const retained = JSON.parse(
      readFileSync(
        path.join(fixtureValue.root, '.agent/work/agent-local-release', candidate.operation_id, 'release.json'),
      ),
    );
    assert.equal(retained.install_started, true);
    await assert.rejects(executeRelease({ ...fixtureValue, operation: candidate.operation_id }));
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('actual structured prepack output followed by one npm array parses without accepting unknown or trailing output', () => {
  const event = {
    schema: 'CandidatePackageBuild/v1',
    production_entrypoints: ['dist/src/index.js'],
    test_issuers_shipped: false,
    schemas: 23,
  };
  const metadata = [{ name: 'vida-agent', version: '0.1.0', filename: 'vida-agent-0.1.0.tgz' }];
  assert.deepEqual(parsePackOutput(json(event) + '\n' + json(metadata)), metadata);
  assert.throws(() => parsePackOutput(json({ ...event, schema: 'Unknown/v1' }) + '\n' + json(metadata)), /Unknown/);
  assert.throws(() => parsePackOutput(json(event) + '\n' + json(metadata) + '\n' + json(metadata)));
  assert.throws(() => parsePackOutput(json(event) + '\n' + json(metadata) + '\ntrailing garbage'));
});
test('interrupted successful pack observation is adopted without a rebuild and rejects packaged source drift', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    const folder = path.join(fixtureValue.root, '.tmp/releases', candidate.operation_id);
    const npmCli = findNpmCli();
    const tar = createRequire(npmCli)('tar');
    const filename = 'vida-agent-0.1.0.tgz',
      archive = path.join(folder, filename);
    const files = ['package.json', 'bin/vida-agent.mjs', 'instructions/development-lifecycle.md'];
    await tar.c({ gzip: true, cwd: fixtureValue.source, prefix: 'package/', file: archive }, files);
    const metadata = [
      {
        name: 'vida-agent',
        version: '0.1.0',
        filename,
        integrity: 'sha512-' + createHash('sha512').update(readFileSync(archive)).digest('base64'),
        files: files.map((relative) => ({ path: relative })),
      },
    ];
    const event = {
      schema: 'CandidatePackageBuild/v1',
      production_entrypoints: ['dist/src/index.js'],
      test_issuers_shipped: false,
      schemas: 23,
    };
    // TEST SETUP: a terminal npm observation was persisted before its controller interrupted.
    writeFileSync(
      path.join(folder, 'pack.json'),
      json({
        command: process.execPath,
        args: [npmCli, 'pack', '--json', '--pack-destination', folder],
        code: 0,
        signal: null,
        stdout: json(event) + '\n' + json(metadata),
      }),
    );
    const journal = path.join(
      fixtureValue.root,
      '.agent/work/agent-local-release',
      candidate.operation_id,
      'release.json',
    );
    writeFileSync(
      journal,
      json({ ...candidate, status: 'failed', source_binding: 'TEST SETUP prior controller bytes' }),
    );
    const result = await executeRelease({
      ...fixtureValue,
      npmCli,
      operation: candidate.operation_id,
      packOnly: true,
    });
    assert.equal(result.status, 'awaiting_assurance');
    assert.equal(fixtureValue.calls.length, 0);
    writeFileSync(path.join(fixtureValue.source, 'bin/vida-agent.mjs'), '// TEST SETUP drift');
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        npmCli,
        operation: candidate.operation_id,
        packOnly: true,
        qualify: async () => ({ source_binding: 'TEST SETUP changed packaged source' }),
      }),
      /Current packaged bytes differ/,
    );
    assert.equal(fixtureValue.calls.length, 0);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('isolated local review receipts use a release namespace while preserving the default cutover contract', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida local review TEST SETUP '));
  try {
    const operation = 'test-setup-release',
      fingerprint = createHash('sha256').update('TEST SETUP sealed source').digest('hex');
    const folder = path.join(root, '.agent/release-assurance', operation);
    mkdirSync(folder, { recursive: true });
    const evidence = ['correctness', 'security', 'assurance'].map((kind) => {
      const relative = `.agent/release-assurance/${operation}/${kind}-review.json`;
      const reverse_path = `.agent/release-assurance/${operation}/${kind}-reverse.json`;
      const review = {
        schema: 'VidaForwardReviewReceipt/v1',
        operation_id: operation,
        kind,
        actor: `TEST SETUP actor ${kind}`,
        history_id: `TEST SETUP history ${kind}`,
        native_tool_ref: `TEST SETUP native ${kind}`,
        sealed_fingerprint: fingerprint,
        fresh_blind: true,
        verdict: 'pass',
        scope_reviewed: 'complete',
      };
      const bytes = JSON.stringify(review, null, 2) + '\n';
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      writeFileSync(path.join(root, relative), bytes);
      const reverse = {
        schema: 'VidaForwardReverseValidation/v1',
        operation_id: operation,
        kind,
        actor: review.actor,
        history_id: review.history_id,
        sealed_fingerprint: fingerprint,
        review_sha256: sha256,
        result: 'pass',
      };
      const reverseBytes = JSON.stringify(reverse, null, 2) + '\n';
      writeFileSync(path.join(root, reverse_path), reverseBytes);
      return {
        kind,
        path: relative,
        reverse_path,
        sha256,
        reverse_sha256: createHash('sha256').update(reverseBytes).digest('hex'),
        status: 'passed',
      };
    });
    verifyForwardReviewSet(root, operation, fingerprint, evidence, '.agent/release-assurance');
    assert.equal(existsSync(path.join(root, '.agent/cutover')), false);
    assert.throws(() => verifyForwardReviewSet(root, operation, fingerprint, evidence), /path invalid/);
    assert.throws(
      () => verifyForwardReviewSet(root, operation, fingerprint, evidence, '.agent/arbitrary'),
      /set invalid/,
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('explicit npm compatibility executes the actual PATH shim from an unrelated cwd and keeps uncertain installs unreplayed', async () => {
  const value = fixture();
  try {
    const release = await npmCompatibility(value, { failCheck: true }),
      unrelated = path.join(value.root, '.tmp/releases', release.candidate.operation_id, 'unrelated-cwd'),
      relativeShimFolder = path.relative(unrelated, path.dirname(release.expectedShim));
    release.env.PATH = [relativeShimFolder, process.env.PATH].filter(Boolean).join(path.delimiter);
    const packed = await executeRelease({ ...release.args, packOnly: true });
    assert.equal(packedDistribution(packed.pack_metadata), 'npm');
    assert.ok(packed.pack_metadata[0].files.every((file) => !file.path.startsWith('dist/standalone/')));
    await assert.rejects(executeRelease(release.args), /observed install check failure/);
    assert.equal(release.state.installs, 1);
    assert.ok(existsSync(path.join(release.installed, 'node_modules/test-owned-dependency/index.js')));
    assert.equal(release.state.cliInvocations.length, 3);
    assert.ok(release.state.cliInvocations.every((invocation) => invocation.cwd === unrelated));
    if (process.platform === 'win32') {
      assert.ok(
        release.state.cliInvocations.every(
          ({ args, commandText }) =>
            args[0] === '/d' &&
            args[1] === '/s' &&
            args[2] === '/c' &&
            commandText.includes(`"${release.expectedShim}"`) &&
            commandText.includes('global prefix') &&
            commandText.includes('Україна'),
        ),
      );
    } else {
      assert.ok(release.state.cliInvocations.every(({ executable }) => executable === release.expectedShim));
      assert.ok(release.state.cliInvocations.every(({ executable }) => executable.includes('global prefix')));
      assert.ok(release.state.cliInvocations.every(({ executable }) => executable.includes('Україна')));
      assert.ok(
        release.state.cliInvocations.every(
          ({ args }) =>
            args[0] === 'version' ||
            (args[0] === 'instructions' && args[1] === '--path') ||
            (args[0] === 'install' && args[1] === '--check'),
        ),
      );
    }
    release.state.failCheck = false;
    writeFileSync(path.join(release.installed, 'unexpected-after-install.txt'), 'TEST SETUP post-effect drift');
    await assert.rejects(executeRelease(release.args), /Prior install outcome differs or remains uncertain/);
    assert.equal(release.state.installs, 1);
    unlinkSync(path.join(release.installed, 'unexpected-after-install.txt'));
    assert.equal((await executeRelease(release.args)).status, 'successful');
    assert.equal(release.state.installs, 1);
    assert.equal((await prepareRelease(value.root)).version, '0.1.1');
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

test('npm postinstall missing, changed, or foreign bytes fail closed and cannot replay installation', async (t) => {
  for (const kind of ['missing', 'changed', 'foreign']) {
    await t.test(kind, async () => {
      const value = fixture();
      try {
        const release = await npmCompatibility(value, { installMutation: kind });
        await executeRelease({ ...release.args, packOnly: true });
        await assert.rejects(executeRelease(release.args));
        const journal = JSON.parse(
          readFileSync(
            path.join(value.root, '.agent/work/agent-local-release', release.candidate.operation_id, 'release.json'),
          ),
        );
        assert.equal(journal.install_started, true);
        assert.equal(release.state.installs, 1);
        assert.equal(release.state.cliInvocations.length, 0);
        release.state.installMutation = undefined;
        await assert.rejects(executeRelease(release.args), /Prior install outcome differs or remains uncertain/);
        assert.equal(release.state.installs, 1);
      } finally {
        rmSync(value.root, { recursive: true, force: true });
      }
    });
  }
});

test('npm preinstall reconciliation replaces missing, changed, extra-file, unknown-directory, and unprojected-manifest payloads', async (t) => {
  for (const kind of ['missing', 'changed', 'extra-file', 'empty-directory', 'projected-manifest']) {
    await t.test(kind, async () => {
      const value = fixture();
      try {
        const release = await npmCompatibility(value);
        await executeRelease({ ...release.args, packOnly: true });
        release.writeInstalled();
        if (kind === 'missing') unlinkSync(path.join(release.installed, 'instructions/development-lifecycle.md'));
        if (kind === 'changed')
          writeFileSync(path.join(release.installed, 'bin/vida-agent.mjs'), '// TEST SETUP changed installed byte');
        if (kind === 'extra-file')
          writeFileSync(path.join(release.installed, 'unexpected.txt'), 'TEST SETUP not archive owned');
        if (kind === 'empty-directory') mkdirSync(path.join(release.installed, 'unexpected-empty-directory'));
        if (kind === 'projected-manifest')
          writeFileSync(
            path.join(release.installed, 'package.json'),
            readFileSync(path.join(value.source, 'package.json')),
          );
        assert.equal((await executeRelease(release.args)).status, 'successful');
        assert.equal(release.state.installs, 1);
      } finally {
        rmSync(value.root, { recursive: true, force: true });
      }
    });
  }
});

test(
  'npm preinstall reconciliation replaces symlinked and hardlinked archive-owned files',
  { skip: process.platform === 'win32' },
  async (t) => {
    for (const kind of ['symlink', 'hardlink']) {
      await t.test(kind, async () => {
        const value = fixture();
        try {
          const release = await npmCompatibility(value);
          await executeRelease({ ...release.args, packOnly: true });
          release.writeInstalled();
          const target = path.join(release.installed, 'bin/vida-agent.mjs'),
            owner = path.join(value.root, 'linked-owner.mjs');
          if (kind === 'symlink') {
            writeFileSync(owner, readFileSync(target));
            unlinkSync(target);
            symlinkSync(owner, target);
          } else {
            linkSync(target, owner);
            unlinkSync(target);
            linkSync(owner, target);
          }
          assert.equal((await executeRelease(release.args)).status, 'successful');
          assert.equal(release.state.installs, 1);
          assert.equal(statSync(owner).nlink, 1);
        } finally {
          rmSync(value.root, { recursive: true, force: true });
        }
      });
    }
  },
);

test(
  'POSIX npm command comparison preserves path case even when an aliased directory resolves to the same shim',
  { skip: process.platform === 'win32' },
  async () => {
    const value = fixture();
    try {
      const release = await npmCompatibility(value),
        alias = path.join(value.root, 'Global Prefix');
      symlinkSync(value.prefix, alias, 'dir');
      const unrelated = path.join(value.root, '.tmp/releases', release.candidate.operation_id, 'unrelated-cwd');
      release.env.PATH = [path.relative(unrelated, path.join(alias, 'bin')), process.env.PATH]
        .filter(Boolean)
        .join(path.delimiter);
      await executeRelease({ ...release.args, packOnly: true });
      await assert.rejects(executeRelease(release.args), /PATH command differs from npm global prefix/);
      assert.equal(release.state.installs, 1);
    } finally {
      rmSync(value.root, { recursive: true, force: true });
    }
  },
);

test(
  'Windows npm command invocation rejects cmd.exe expansion in the resolved shim path',
  { skip: process.platform !== 'win32' },
  async () => {
    const value = fixture();
    try {
      value.prefix = path.join(value.root, 'prefix %TEMP%');
      value.env.PATH = value.prefix;
      mkdirSync(path.join(value.prefix, 'node_modules'), { recursive: true });
      const release = await npmCompatibility(value);
      await executeRelease({ ...release.args, packOnly: true });
      await assert.rejects(executeRelease(release.args), /unsafe cmd\.exe command text/);
      assert.equal(release.state.installs, 1);
      assert.equal(release.state.cliInvocations.length, 0);
    } finally {
      rmSync(value.root, { recursive: true, force: true });
    }
  },
);

test(
  'Windows npm PATH casing resolves to the canonical saved shim without reinstalling',
  { skip: process.platform !== 'win32' },
  async () => {
    const value = fixture();
    try {
      const release = await npmCompatibility(value);
      release.env.PATH = [path.dirname(release.expectedShim).toUpperCase(), process.env.PATH]
        .filter(Boolean)
        .join(path.delimiter);
      await executeRelease({ ...release.args, packOnly: true });
      assert.equal((await executeRelease(release.args)).status, 'successful');
      const journal = JSON.parse(
        readFileSync(
          path.join(value.root, '.agent/work/agent-local-release', release.candidate.operation_id, 'release.json'),
        ),
      );
      assert.equal(journal.path_command, release.expectedShim);
      assert.equal(release.state.installs, 1);
      assert.equal((await executeRelease(release.args)).status, 'successful');
      assert.equal(release.state.installs, 1);
    } finally {
      rmSync(value.root, { recursive: true, force: true });
    }
  },
);

test('exact archive distribution rejects ambiguous paths and refuses a different requested channel before installation', async () => {
  assert.throws(
    () => packedDistribution([{ files: [{ path: 'package.json' }, { path: 'package.json' }] }]),
    /ambiguous/,
  );
  assert.throws(() => packedDistribution([{ files: [{ path: 'dist/standalone/../asset' }] }]), /ambiguous/);
  assert.equal(packedDistribution([{ files: [{ path: 'dist/standalone/asset' }] }]), 'native');
  const value = fixture();
  try {
    const candidate = await prepareRelease(value.root);
    await assert.rejects(
      executeRelease({
        ...value,
        operation: candidate.operation_id,
        packOnly: true,
        distribution: 'native',
      }),
      /distribution differs/,
    );
    assert.equal(
      value.calls.some((args) => args[1] === 'install'),
      false,
    );
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
