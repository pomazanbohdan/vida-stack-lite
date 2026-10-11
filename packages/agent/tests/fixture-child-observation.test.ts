import { expect, test } from 'bun:test';
import * as realApis from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

const options = {
  runId: 'fixture-observer-test',
  parentPid: process.pid,
  fixtureFingerprint: 'a'.repeat(64),
  maxOutputBytes: 1024,
};

test('fixture child observer preserves decoded spawnSync output and binds the exact command', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  expect(module.createFixtureChildObserver).toBeFunction();
  const observer = module.createFixtureChildObserver(realApis, options);
  const argv = ['-e', 'process.stdout.write("ok")'];
  const returned = observer.apis.spawnSync(process.execPath, argv, { cwd: process.cwd(), encoding: 'utf8' });
  expect(returned.status).toBe(0);
  expect(returned.stdout).toBe('ok');
  const proof = observer.finish();
  expect(proof.complete).toBe(true);
  expect(proof.launch_count).toBe(1);
  const child = proof.children[0];
  expect(child?.argv).toEqual(argv);
  expect(child?.cwd).toBe(process.cwd());
  expect(child?.stdout.representation).toBe('returned-text-utf8');
  expect(child?.stdout.bytes).toBe(2);
  expect(child?.stdout.sha256).toBe('2689367b205c16ce32ed4200942b8b8b1e262dfc70d9bc9fbc77c49699a4f1df');
  expect(child?.executable_sha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(child?.environment_sha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(child?.exit_code).toBe(0);
  expect(child?.terminal_observed).toBe(true);
});

test('fixture child observer waits for close and observes existing flowing streams', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  expect(module.createFixtureChildObserver).toBeFunction();
  const observer = module.createFixtureChildObserver(realApis, options);
  const child = observer.apis.spawn(process.execPath, ['-e', 'setTimeout(()=>process.stdout.write("async"),50)'], {
    stdio: 'pipe',
  });
  let text = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    text += chunk.toString();
  });
  expect(observer.finish().complete).toBe(false);
  await once(child, 'close');
  const proof = observer.finish();
  expect(text).toBe('async');
  expect(proof.complete).toBe(true);
  expect(proof.children[0]?.stdout.representation).toBe('emitted-bytes');
  expect(proof.children[0]?.stdout.bytes).toBe(5);
  expect(proof.children[0]?.terminal_observed).toBe(true);
});

test('fixture child observer captures expected subject rejection but denies truncated output', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  expect(module.createFixtureChildObserver).toBeFunction();
  const observer = module.createFixtureChildObserver(realApis, { ...options, maxOutputBytes: 1 });
  const returned = observer.apis.spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write("long");process.exitCode=1'],
    { encoding: 'utf8' },
  );
  expect(returned.status).toBe(1);
  expect(returned.stdout).toBe('long');
  expect(observer.finish().complete).toBe(false);
  expect(observer.finish().children[0]?.stdout.truncated).toBe(true);
  const rejection = module.createFixtureChildObserver(realApis, options);
  expect(rejection.apis.spawnSync(process.execPath, ['-e', 'process.exitCode=1'], { encoding: 'utf8' }).status).toBe(1);
  expect(rejection.finish().complete).toBe(true);
});

test('fixture child observer denies timeout and unsupported interpreter inputs without changing returns', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  const observer = module.createFixtureChildObserver(realApis, options);
  const timeout = observer.apis.spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], {
    encoding: 'utf8',
    timeout: 20,
  });
  expect(timeout.error).toBeDefined();
  expect(observer.finish().complete).toBe(false);
  const unsupported = module.createFixtureChildObserver(realApis, options);
  expect(unsupported.apis.spawnSync(process.execPath, ['--version'], { encoding: 'utf8' }).status).toBe(0);
  expect(unsupported.finish().complete).toBe(false);
});

test('fixture observer intercepts Bun named and default builtin imports in an isolated process', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'fixture-child-seam-'));
  const script = path.join(directory, 'seam.ts');
  try {
    writeFileSync(
      script,
      `import {mock} from 'bun:test';
import * as actual from 'node:child_process';
import {createFixtureChildObserver} from ${JSON.stringify(path.resolve(import.meta.dir, '../tooling/fixture-child-observation.ts'))};
const observer=createFixtureChildObserver(actual,${JSON.stringify(options)});
mock.module('node:child_process',()=>({...actual,...observer.apis,default:{...actual.default,...observer.apis}}));
const named=await import('node:child_process');
const alias=await import('child_process');
if(named.spawnSync!==observer.apis.spawnSync || named.default.spawnSync!==observer.apis.spawnSync || alias.spawnSync!==observer.apis.spawnSync) throw new Error('builtin interception missing');
const result=named.spawnSync(process.execPath,['-e','process.stdout.write("seam")'],{encoding:'utf8'});
if(result.stdout!=='seam'||!observer.finish().complete||observer.finish().launch_count!==1) throw new Error('subject observation missing');
process.stdout.write('qualified');
`,
    );
    const result = realApis.spawnSync(process.execPath, ['--no-env-file', '--no-install', script], {
      encoding: 'utf8',
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('qualified');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('fixture child receipt rejects mismatched context, duplicates and incomplete proof', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  const observer = module.createFixtureChildObserver(realApis, options);
  observer.apis.spawnSync(process.execPath, ['-e', 'process.exitCode=1'], { encoding: 'utf8' });
  const proof = observer.finish();
  expect(() => module.assertFixtureChildProof(proof, options)).not.toThrow();
  for (const invalid of [
    undefined,
    { ...proof, run_id: 'other' },
    { ...proof, parent_pid: 0 },
    { ...proof, fixture_fingerprint: 'b'.repeat(64) },
    { ...proof, complete: false },
    { ...proof, launch_count: 0 },
    { ...proof, children: [...proof.children, ...proof.children] },
    { ...proof, children: proof.children.map((child) => ({ ...child, stdout: { ...child.stdout, sha256: 'wrong' } })) },
    { ...proof, children: proof.children.map((child) => ({ ...child, signal: 'SIGTERM' })) },
    { ...proof, authority: 'coverage' },
  ]) {
    expect(() => module.assertFixtureChildProof(invalid, options)).toThrow();
  }
});

test('fixture child observer cannot call unread buffered streams complete', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  const child = new realApis.ChildProcess();
  const stdout = new Readable({ read() {} });
  const stderr = new Readable({ read() {} });
  stdout.push(Buffer.from('unread'));
  Object.defineProperties(child, {
    pid: { value: process.pid + 1 },
    stdout: { value: stdout },
    stderr: { value: stderr },
  });
  const observer = module.createFixtureChildObserver(
    { ...realApis, spawn: (() => child) as typeof realApis.spawn },
    options,
  );
  expect(observer.apis.spawn(process.execPath, ['-e', ''], { stdio: 'pipe' })).toBe(child);
  child.emit('close', 0, null);
  expect(stdout.readableLength).toBe(6);
  expect(stdout.readableFlowing).toBeNull();
  expect(observer.finish().complete).toBe(false);
  expect(observer.finish().children[0]?.stdout.available).toBe(false);
  stdout.destroy();
  stderr.destroy();
});

test('fixture child observer records explicitly requested interruption without calling it success or Killed', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  const observer = module.createFixtureChildObserver(realApis, options);
  const child = observer.apis.spawn(
    process.execPath,
    ['-e', 'process.stdout.write("ready");setInterval(()=>{},1000)'],
    { stdio: 'pipe' },
  );
  child.stderr?.on('data', () => {});
  if (!child.stdout) throw new Error('Expected an actual piped fixture child.');
  await once(child.stdout, 'data');
  const closed = once(child, 'close');
  expect(child.kill('SIGTERM')).toBe(true);
  await closed;
  const proof = observer.finish();
  expect(proof.complete).toBe(true);
  expect(proof.children[0]?.exit_code).toBeNull();
  expect(proof.children[0]?.signal).toBe('SIGTERM');
  expect(proof.children[0]?.termination_request).toBe('SIGTERM');
  expect(() => module.assertFixtureChildProof(proof, options)).not.toThrow();
  expect(() =>
    module.assertFixtureChildProof(
      { ...proof, children: proof.children.map((row) => ({ ...row, termination_request: null })) },
      options,
    ),
  ).toThrow();
});

test('fixture child observer denies unsupported direct APIs while returning their original output', async () => {
  const module = await import('../tooling/fixture-child-observation.ts');
  const observer = module.createFixtureChildObserver(realApis, options);
  const exec: unknown = Reflect.get(observer.apis, 'execFileSync');
  if (typeof exec !== 'function') throw new Error('Expected unsupported API observation.');
  const returned: unknown = Reflect.apply(exec, observer.apis, [process.execPath, ['--version'], { encoding: 'utf8' }]);
  expect(returned).toBe(process.versions.bun + '\n');
  expect(observer.finish().unsupported_calls).toBe(1);
  expect(observer.finish().complete).toBe(false);
});
