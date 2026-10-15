import { expect, test } from 'bun:test';
import { junitOutcome } from '../tooling/mutation-evidence.ts';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  runtimePackageAccess,
  readRuntimePackageResourceBytes,
  readRuntimePackageResourceText,
} from '../src/config/runtime-config.js';
import { safeRepositoryProviderAvailable } from '../src/config/safe-repository-access.js';
import { runBoundedSubprocess } from './helpers/bounded-subprocess.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

test('package resource bytes prefer a fresh verified observation and preserve its receiver', () => {
  const access = runtimePackageAccess();
  const calls: string[] = [];
  let image = Buffer.from('first image');
  const reader = {
    ...access,
    readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
      expect(this).toBe(reader);
      calls.push(`${target}:${label}:${maxBytes}`);
      return image;
    },
    readStableBytes(): Buffer | null {
      throw new Error('verified package read must not use cooperative fallback');
    },
    readBytes(): Buffer {
      throw new Error('verified package read must not use mutable fallback');
    },
  };

  expect(readRuntimePackageResourceBytes(reader, 'schemas/example.json', 'test schema', 4096)).toBe(image);
  image = Buffer.from('changed image');
  expect(readRuntimePackageResourceBytes(reader, 'schemas/example.json', 'test schema', 4096)).toBe(image);
  expect(calls).toEqual(['schemas/example.json:test schema:4096', 'schemas/example.json:test schema:4096']);
});

test('package resource bytes retain cooperative fallback only when verified reads are unavailable', () => {
  const access = runtimePackageAccess();
  const { readVerifiedCaptureBytes: ignoredVerifiedReader, ...withoutVerifiedReader } = access;
  void ignoredVerifiedReader;
  const calls: string[] = [];
  const bytes = Buffer.from('cooperative image');
  const reader = {
    ...withoutVerifiedReader,
    readStableBytes(target: string, label: string): Buffer {
      expect(this).toBe(reader);
      calls.push(`stable:${target}:${label}`);
      return bytes;
    },
    readBytes(target: string, label: string): Buffer {
      calls.push(`bytes:${target}:${label}`);
      return bytes;
    },
  };

  expect(readRuntimePackageResourceBytes(reader, 'templates/example.yaml', 'test template')).toBe(bytes);
  expect(calls).toEqual(['stable:templates/example.yaml:test template']);
});

test('package resource reads use the existing CAS reader when verified and stable methods are unavailable', () => {
  const access = runtimePackageAccess();
  const { readVerifiedCaptureBytes: ignoredVerifiedReader, ...withoutVerifiedReader } = access;
  const { readStableBytes: ignoredStableReader, ...withoutStableReader } = withoutVerifiedReader;
  void ignoredVerifiedReader;
  void ignoredStableReader;
  const calls: string[] = [];
  const bytes = Buffer.from('CAS image');
  const reader = {
    ...withoutStableReader,
    readBytes(target: string, label: string): Buffer {
      expect(this).toBe(reader);
      calls.push(`${target}:${label}`);
      return bytes;
    },
  };

  expect(readRuntimePackageResourceBytes(reader, 'schemas/example.json', 'CAS schema')).toBe(bytes);
  expect(calls).toEqual(['schemas/example.json:CAS schema']);
});

test('package resource failures fail closed without retrying another reader', () => {
  const access = runtimePackageAccess();
  const calls: string[] = [];
  const reader = {
    ...access,
    readVerifiedCaptureBytes(target: string): Buffer {
      calls.push(`verified:${target}`);
      throw new Error('verified resource unavailable');
    },
    readStableBytes(target: string): Buffer {
      calls.push(`stable:${target}`);
      return Buffer.from('fallback must not be used');
    },
    readBytes(target: string): Buffer {
      calls.push(`bytes:${target}`);
      return Buffer.from('fallback must not be used');
    },
  };

  expect(() => readRuntimePackageResourceBytes(reader, 'schemas/missing.json', 'required schema')).toThrow(
    'verified resource unavailable',
  );
  expect(calls).toEqual(['verified:schemas/missing.json']);
});

test('package resource bounds reject an oversized verified image', () => {
  const access = runtimePackageAccess();
  let calls = 0;
  const reader = {
    ...access,
    readVerifiedCaptureBytes(_target: string, _label: string, maxBytes?: number): Buffer {
      calls++;
      expect(maxBytes).toBe(3);
      return Buffer.from('four');
    },
  };
  expect(() => readRuntimePackageResourceBytes(reader, 'schemas/large.json', 'bounded schema', 3)).toThrow(
    'per-file byte limit',
  );
  expect(calls).toBe(1);
});

test('required package resources deny stable absence', () => {
  const access = runtimePackageAccess();
  const { readVerifiedCaptureBytes: ignoredVerifiedReader, ...withoutVerifiedReader } = access;
  void ignoredVerifiedReader;
  const calls: string[] = [];
  const reader = {
    ...withoutVerifiedReader,
    readStableBytes(target: string, label: string): Buffer | null {
      calls.push(`${target}:${label}`);
      return null;
    },
  };
  expect(() => readRuntimePackageResourceBytes(reader, 'schemas/missing.json', 'required schema')).toThrow();
  expect(calls).toEqual(['schemas/missing.json:required schema']);
});

test('package resource reads reject a foreign access root before invoking its provider', () => {
  const access = runtimePackageAccess();
  let calls = 0;
  const reader = {
    ...access,
    repository_root: access.repository_root + '-foreign',
    readVerifiedCaptureBytes(): Buffer {
      calls++;
      return Buffer.from('foreign bytes');
    },
  };
  expect(() => readRuntimePackageResourceBytes(reader, 'schemas/example.json', 'root binding')).toThrow();
  expect(calls).toBe(0);
});

test('package resource reads reject malformed targets and invalid bounds before provider calls', () => {
  const access = runtimePackageAccess();
  let calls = 0;
  const reader = {
    ...access,
    readVerifiedCaptureBytes(): Buffer {
      calls++;
      return Buffer.from('valid');
    },
  };
  expect(() => readRuntimePackageResourceBytes(reader, '../outside.json', 'unsafe target')).toThrow();
  expect(() => readRuntimePackageResourceBytes(reader, 'schemas/example.json', 'invalid bound', 0)).toThrow();
  expect(calls).toBe(0);
});

test('package resource text uses strict UTF-8 decoding', () => {
  const access = runtimePackageAccess();
  const valid = {
    ...access,
    readVerifiedCaptureBytes: () => Buffer.from('\uFEFFУкраїна', 'utf8'),
  };
  expect(readRuntimePackageResourceText(valid, 'schemas/text.json', 'strict schema')).toBe('\uFEFFУкраїна');
  const reader = {
    ...access,
    readVerifiedCaptureBytes: () => Buffer.from([0xc3, 0x28]),
  };
  expect(() => readRuntimePackageResourceText(reader, 'schemas/invalid.json', 'strict schema')).toThrow();
});

// This coordinated correctness control does not qualify real read overlap or common-resource removal.
test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable)(
  'two cold package readers coordinate verified package resource correctness',
  async () => {
    const deadlineAt = performance.now() + 5_000;
    const assertBeforeDeadline = (phase: string): void => {
      if (performance.now() >= deadlineAt)
        throw new Error(`Package-reader control exceeded its deadline during ${phase}`);
    };
    const access = runtimePackageAccess();
    if (access.provider !== 'linux-proc-fd' || !access.readVerifiedCaptureBytes)
      throw new Error('Linux verified package reader is unavailable');
    const packageRoot = path.resolve(access.repository_root);
    const resources = [
      { path: 'package.json', label: 'runtime package identity' },
      { path: 'schemas/agent-runtime-config.v1.schema.json', label: 'runtime configuration schema' },
      { path: 'templates/agent-runtime.config.template.v1.yaml', label: 'runtime configuration template' },
    ];
    const expected = resources.map(({ path: target, label }) => {
      const bytes = readRuntimePackageResourceBytes(access, target, label, 1024 * 1024);
      const text = readRuntimePackageResourceText(access, target, label, 1024 * 1024);
      return {
        path: target,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        textSha256: createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex'),
      };
    });
    const targets = resources.map(({ path: target }) => target);
    const casPaths = targets.map((target) => {
      const absolute = path.join(packageRoot, target);
      return path.join(path.dirname(absolute), `.${path.basename(absolute)}.cas.lock`);
    });
    const sidecarsBefore = casPaths.map((file) => existsSync(file));
    expect(sidecarsBefore).toEqual([false, false, false]);

    const roots: string[] = [];
    let cleanupAllowed = false;
    try {
      roots.push(mkdtempSync(path.join(tmpdir(), 'vida-package-reader-a-')));
      roots.push(mkdtempSync(path.join(tmpdir(), 'vida-package-reader-b-')));
      const runtimeConfigUrl = new URL('../src/config/runtime-config.js', import.meta.url).href;
      const readerSource = `
import { mock } from 'bun:test';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
const nativeFs = { ...fs };
const id = process.env.VIDA_PACKAGE_READER_ID;
const boundaryPath = ${JSON.stringify(path.join(packageRoot, 'schemas/agent-runtime-config.v1.schema.json'))};
let boundaryHeld = false;
function waitForCommand(expected) {
  const command = Buffer.alloc(1);
  if (nativeFs.readSync(0, command, 0, 1, null) !== 1 || command.toString() !== expected)
    throw new Error('package reader command missing: ' + expected);
}
let packageWriteSyncs = 0;
let packageFsyncs = 0;
await mock.module('node:fs', () => ({
  ...nativeFs,
  readSync(fd, ...args) {
    if (!boundaryHeld && nativeFs.realpathSync('/proc/self/fd/' + fd) === boundaryPath) {
      boundaryHeld = true;
      nativeFs.writeSync(1, JSON.stringify({ kind: 'read-boundary', id, path: boundaryPath }) + '\\n');
      waitForCommand('R');
    }
    return nativeFs.readSync(fd, ...args);
  },
  writeSync(fd, ...args) {
    if (typeof fd === 'number' && fd > 2) packageWriteSyncs++;
    return nativeFs.writeSync(fd, ...args);
  },
  fsyncSync(fd) { packageFsyncs++; return nativeFs.fsyncSync(fd); },
}));
const { runtimePackageAccess, readRuntimePackageResourceBytes, readRuntimePackageResourceText } = await import(${JSON.stringify(runtimeConfigUrl)});
const consumerRoot = process.env.VIDA_PACKAGE_CONSUMER_ROOT;
if (process.cwd() !== consumerRoot) throw new Error('reader did not use its fresh consumer root');
nativeFs.writeSync(1, JSON.stringify({ kind: 'ready', id, cwd: process.cwd() }) + '\\n');
waitForCommand('G');
const started = process.hrtime.bigint().toString();
const access = runtimePackageAccess();
if (access.provider !== 'linux-proc-fd' || !access.readVerifiedCaptureBytes || access.repository_root !== ${JSON.stringify(packageRoot)})
  throw new Error('reader did not select the actual verified runtime package');
const resources = ${JSON.stringify(resources)};
const observations = resources.map(({ path, label }) => {
  const bytes = readRuntimePackageResourceBytes(access, path, label, 1024 * 1024);
  const text = readRuntimePackageResourceText(access, path, label, 1024 * 1024);
  const textBytes = Buffer.from(text, 'utf8');
  if (!textBytes.equals(bytes)) throw new Error('strict text and byte views differ');
  return {
    path,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    textSha256: createHash('sha256').update(textBytes).digest('hex'),
  };
});
const manifest = JSON.parse(readRuntimePackageResourceText(access, 'package.json', 'runtime package identity', 1024 * 1024));
const ended = process.hrtime.bigint().toString();
process.stdout.write(JSON.stringify({
  kind: 'done', id, cwd: process.cwd(), repositoryRoot: access.repository_root,
  packageName: manifest.name, started, ended, resources: observations,
  packageWriteSyncs, packageFsyncs,
}) + '\\n');
`;
      const orchestrator = `
import { spawn } from 'node:child_process';
const configs = ${JSON.stringify(roots.map((root, index) => ({ id: `reader-${index + 1}`, root })))};
const source = ${JSON.stringify(readerSource)};
const states = [];
function observe(child, config) {
  const state = { ...config, child, messages: [], waiters: [], close: null, childError: null };
  const publish = (message) => {
    state.messages.push(message);
    for (const waiter of [...state.waiters]) {
      if (waiter.kind === message.kind) {
        state.waiters.splice(state.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
  };
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output += chunk;
    for (;;) {
      const end = output.indexOf('\\n');
      if (end < 0) break;
      const line = output.slice(0, end); output = output.slice(end + 1);
      try { publish(JSON.parse(line)); } catch { state.childError = 'invalid reader protocol line'; }
    }
  });
  child.stderr.setEncoding('utf8');
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; if (stderr.length > 8192) stderr = stderr.slice(-8192); });
  state.waitFor = (kind) => {
    const existing = state.messages.find((message) => message.kind === kind);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => state.waiters.push({ kind, resolve }));
  };
  state.stderr = () => stderr;
  state.terminal = new Promise((resolve) => child.once('close', (exitCode, signal) => {
    state.close = { closeObserved: true, exitCode, signal };
    resolve(state.close);
  }));
  child.once('error', (error) => { state.childError = String(error); });
  child.stdin.on('error', (error) => { state.childError = String(error); });
  states.push(state);
  return state;
}
const readerPoolDeadline = performance.now() + 3000;
function bounded(promise, label) {
  const remaining = Math.floor(readerPoolDeadline - performance.now());
  if (remaining <= 0) return Promise.reject(new Error(label + ' deadline; reader pool budget spent'));
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' deadline')), remaining); })])
    .finally(() => clearTimeout(timer));
}
let failure = null;
try {
  if (performance.now() >= readerPoolDeadline) throw new Error('reader pool budget spent before child launch');
  for (const config of configs) {
    const child = spawn(process.execPath, ['--no-env-file', '--no-install', '--eval', source], {
      cwd: config.root, env: { ...process.env, VIDA_PACKAGE_READER_ID: config.id, VIDA_PACKAGE_CONSUMER_ROOT: config.root },
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    observe(child, config);
  }
  const ready = await bounded(Promise.all(states.map((state) => state.waitFor('ready'))), 'reader readiness');
  for (const state of states) state.child.stdin.write('G');
  const boundaries = await bounded(Promise.all(states.map((state) => state.waitFor('read-boundary'))), 'descriptor-read boundary');
  // Neither real descriptor read can complete before both readers enter it.
  for (const state of states) state.child.stdin.write('R');
  const done = await bounded(Promise.all(states.map((state) => state.waitFor('done'))), 'reader completion');
  const terminal = await bounded(Promise.all(states.map((state) => state.terminal)), 'reader terminal receipts');
  if (terminal.some((receipt) => !receipt.closeObserved || receipt.exitCode !== 0 || receipt.signal !== null))
    throw new Error('reader terminal receipt was unsuccessful');
  const durations = done.map(({ id, started, ended }) => {
    const durationNs = BigInt(ended) - BigInt(started);
    if (durationNs <= 0n) throw new Error('reader-local active duration was not positive');
    return { id, durationNs: durationNs.toString() };
  });
  process.stdout.write(JSON.stringify({
    protocol: 'package-reader-coordinated-read/v1',
    ready: ready.map(({ id, cwd }) => ({ id, cwd })),
    boundaries,
    durations,
    receipts: states.map((state, index) => ({ id: state.id, ...terminal[index], childError: state.childError, stderr: state.stderr() })),
    observations: done,
  }) + '\\n');
} catch (error) {
  failure = String(error);
  for (const state of states) if (!state.close) { try { state.child.kill('SIGKILL'); } catch {} }
  let cleanupTimer;
  await Promise.race([
    Promise.all(states.map((state) => state.terminal)),
    new Promise((resolve) => { cleanupTimer = setTimeout(resolve, 700); }),
  ]).finally(() => clearTimeout(cleanupTimer));
  process.stdout.write(JSON.stringify({
    protocol: 'package-reader-coordinated-read/v1', failure,
    ready: states.flatMap((state) => state.messages.filter((message) => message.kind === 'ready')),
    receipts: states.map((state) => ({ id: state.id, ...(state.close ?? { closeObserved: false, exitCode: null, signal: null }), childError: state.childError, stderr: state.stderr() })),
    done: states.flatMap((state) => state.messages.filter((message) => message.kind === 'done')),
  }) + '\\n');
  process.exitCode = 1;
}
`;
      const subprocessTimeoutMs = Math.min(4_000, Math.floor(deadlineAt - performance.now() - 1_000));
      if (subprocessTimeoutMs <= 0) throw new Error('Insufficient deadline remains to start package-reader children');
      const result = await runBoundedSubprocess(
        process.execPath,
        ['--no-env-file', '--no-install', '--eval', orchestrator],
        { cwd: packageRoot, timeoutMs: subprocessTimeoutMs, stdoutLimitBytes: 128 * 1024, stderrLimitBytes: 32 * 1024 },
      );
      if (
        !result.closeObserved ||
        result.timedOut ||
        result.exitCode !== 0 ||
        result.signal !== null ||
        result.childError !== null
      ) {
        process.stderr.write(
          `Package-reader control custody evidence: ${JSON.stringify({
            roots,
            closeObserved: result.closeObserved,
            timedOut: result.timedOut,
            exitCode: result.exitCode,
            signal: result.signal,
            childError: result.childError,
            terminationRequestConfirmed: result.terminationRequestConfirmed,
            terminationError: result.terminationError,
            stdout: result.stdout.toString('utf8'),
            stderr: result.stderr.toString('utf8'),
          })}\n`,
        );
      }
      expect(result.closeObserved).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.childError).toBeNull();
      expect(result.exitCode).toBe(0);
      expect(result.signal).toBeNull();
      let parsedReport: unknown;
      try {
        parsedReport = JSON.parse(result.stdout.toString('utf8').trim());
      } catch (error) {
        throw new Error(`Malformed package-reader report (${String(error)}); output=${result.stdout.toString('utf8')}`);
      }
      if (!isRecord(parsedReport)) throw new Error('Package-reader report is not an object');
      const report = parsedReport;
      if (report.protocol !== 'package-reader-coordinated-read/v1')
        throw new Error('Unexpected package-reader report protocol');
      if (report.failure !== undefined) {
        if (typeof report.failure !== 'string') throw new Error('Package-reader failure receipt is not text');
        throw new Error(`Package-reader orchestrator reported failure: ${report.failure}`);
      }
      if (
        !Array.isArray(report.ready) ||
        !Array.isArray(report.boundaries) ||
        !Array.isArray(report.durations) ||
        !Array.isArray(report.receipts) ||
        !Array.isArray(report.observations)
      )
        throw new Error('Package-reader report is missing required arrays');
      const ready = report.ready.map((row) => {
        if (!isRecord(row) || typeof row.id !== 'string' || typeof row.cwd !== 'string')
          throw new Error('Malformed package-reader readiness receipt');
        return { id: row.id, cwd: row.cwd };
      });
      const durations = report.durations.map((row) => {
        if (!isRecord(row) || typeof row.id !== 'string' || typeof row.durationNs !== 'string')
          throw new Error('Malformed package-reader local duration');
        return { id: row.id, durationNs: row.durationNs };
      });
      const receipts = report.receipts.map((row) => {
        if (
          !isRecord(row) ||
          typeof row.id !== 'string' ||
          typeof row.closeObserved !== 'boolean' ||
          (row.exitCode !== null && typeof row.exitCode !== 'number') ||
          (row.signal !== null && typeof row.signal !== 'string') ||
          (row.childError !== null && typeof row.childError !== 'string') ||
          typeof row.stderr !== 'string'
        )
          throw new Error('Malformed package-reader terminal receipt');
        return row;
      });
      const observations = report.observations.map((row) => {
        if (
          !isRecord(row) ||
          typeof row.id !== 'string' ||
          typeof row.cwd !== 'string' ||
          typeof row.repositoryRoot !== 'string' ||
          typeof row.packageName !== 'string' ||
          !Array.isArray(row.resources) ||
          typeof row.packageWriteSyncs !== 'number' ||
          typeof row.packageFsyncs !== 'number'
        )
          throw new Error('Malformed package-reader observation');
        const observedResources = row.resources.map((resource) => {
          if (
            !isRecord(resource) ||
            typeof resource.path !== 'string' ||
            typeof resource.bytes !== 'number' ||
            typeof resource.sha256 !== 'string' ||
            typeof resource.textSha256 !== 'string'
          )
            throw new Error('Malformed package resource observation');
          return {
            path: resource.path,
            bytes: resource.bytes,
            sha256: resource.sha256,
            textSha256: resource.textSha256,
          };
        });
        return {
          id: row.id,
          cwd: row.cwd,
          repositoryRoot: row.repositoryRoot,
          packageName: row.packageName,
          resources: observedResources,
          packageWriteSyncs: row.packageWriteSyncs,
          packageFsyncs: row.packageFsyncs,
        };
      });
      expect(ready.map(({ cwd }) => cwd)).toEqual(roots);
      expect(report.boundaries).toEqual(
        roots.map((_, index) => ({
          kind: 'read-boundary',
          id: `reader-${index + 1}`,
          path: path.join(packageRoot, 'schemas/agent-runtime-config.v1.schema.json'),
        })),
      );
      expect(durations).toHaveLength(2);
      for (const duration of durations) expect(BigInt(duration.durationNs) > 0n).toBe(true);
      expect(receipts).toHaveLength(2);
      for (const receipt of receipts) {
        expect(receipt.closeObserved).toBe(true);
        expect(receipt.exitCode).toBe(0);
        expect(receipt.signal).toBeNull();
        expect(receipt.childError).toBeNull();
        expect(receipt.stderr).toBe('');
      }
      expect(observations).toHaveLength(2);
      for (let index = 0; index < observations.length; index++) {
        const observation = observations[index];
        if (!observation) throw new Error(`Missing package-reader observation ${index}`);
        const consumerRoot = roots[index];
        if (!consumerRoot) throw new Error(`Missing consumer root ${index}`);
        expect(observation.id).toBe(`reader-${index + 1}`);
        expect(observation.cwd).toBe(consumerRoot);
        expect(observation.repositoryRoot).toBe(packageRoot);
        expect(observation.packageName).toBe('vida-agent');
        expect(observation.resources).toEqual(expected);
        expect(observation.packageWriteSyncs).toBe(0);
        expect(observation.packageFsyncs).toBe(0);
      }
      for (let index = 0; index < resources.length; index++) {
        const resource = resources[index];
        const expectedResource = expected[index];
        if (!resource || !expectedResource) throw new Error(`Missing expected package resource ${index}`);
        const { path: target, label } = resource;
        const current = readRuntimePackageResourceBytes(access, target, label, 1024 * 1024);
        expect(current.length).toBe(expectedResource.bytes);
        expect(createHash('sha256').update(current).digest('hex')).toBe(expectedResource.sha256);
      }
      expect(casPaths.map((file) => existsSync(file))).toEqual(sidecarsBefore);
      assertBeforeDeadline('post-close assertions');
      cleanupAllowed = true;
    } finally {
      if (cleanupAllowed && performance.now() < deadlineAt) {
        for (const root of roots) rmSync(root, { recursive: true, force: true });
        expect(roots.map((root) => existsSync(root))).toEqual(roots.map(() => false));
      } else {
        process.stderr.write(`Retained package-reader roots after incomplete custody: ${roots.join(', ')}\n`);
      }
    }
  },
  { timeout: 5_000 },
);

// Runs two copies of one configured-context caller contour against the same
// executing package. The package instruction read is parked at its verified descriptor boundary.
test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable)(
  'two configured-context callers overlap one verified package instruction read',
  async () => {
    const deadlineAt = performance.now() + 9_500;
    const assertBeforeDeadline = (phase: string): void => {
      if (performance.now() >= deadlineAt)
        throw new Error(`Caller resource pilot exceeded its deadline during ${phase}`);
    };
    const access = runtimePackageAccess();
    if (access.provider !== 'linux-proc-fd' || !access.readVerifiedCaptureBytes)
      throw new Error('Linux verified package reader is unavailable');
    const packageRoot = path.resolve(access.repository_root);
    const sourceRoot = path.resolve(packageRoot, '../..');
    const sharedResource = path.join(packageRoot, 'instructions/development-lifecycle.md');
    const configSchema = path.join(packageRoot, 'schemas/agent-runtime-config.v1.schema.json');
    const targets = [sharedResource, configSchema];
    const sidecarPaths = targets.map((target) => path.join(path.dirname(target), `.${path.basename(target)}.cas.lock`));
    const sidecarsBefore = sidecarPaths.map((target) => existsSync(target));
    expect(sidecarsBefore).toEqual([false, false]);
    const expected = targets.map((target) => {
      const bytes = readFileSync(target);
      return { path: target, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    });
    const pilotParent = path.join(sourceRoot, '.tmp', 'p0p1-resume-f553252');
    mkdirSync(pilotParent, { recursive: true });
    const outputRoot = mkdtempSync(path.join(pilotParent, 'caller-resource-pilot-v15-'));
    const marker = '__VIDA_CALLER_RESOURCE_PILOT_V15__';
    const preloadPath = path.join(outputRoot, 'reader-preload.ts');
    const preloadSource = `
import { mock } from 'bun:test';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
const nativeFs = { ...fs };
const marker = ${JSON.stringify(marker)};
const id = process.env.VIDA_CALLER_RESOURCE_PILOT_ID;
const packageRoot = ${JSON.stringify(packageRoot)};
const resourcePath = ${JSON.stringify(sharedResource)};
const schemaPath = ${JSON.stringify(configSchema)};
const sidecarPath = ${JSON.stringify(sidecarPaths[0])};
let parked = false;
const descriptors = new Map();
function emit(value) { nativeFs.writeSync(1, marker + JSON.stringify(value) + '\\n'); }
function waitForRelease() {
  const byte = Buffer.alloc(1);
  if (nativeFs.readSync(0, byte, 0, 1, null) !== 1 || byte.toString() !== 'R')
    throw new Error('caller resource pilot release command is missing');
}
mock.module('node:fs', () => ({
  ...nativeFs,
  readFileSync(target, ...args) {
    const result = nativeFs.readFileSync(target, ...args);
    let resolved;
    try { if (typeof target === 'string') resolved = nativeFs.realpathSync(target); } catch {}
    if (resolved === schemaPath) {
      const bytes = typeof result === 'string' ? Buffer.from(result, args[0] || 'utf8') : Buffer.from(result);
      emit({ kind: 'schema-read', id, pid: process.pid, path: schemaPath, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        phase: process.env.VIDA_CALLER_RESOURCE_PILOT_PHASE || 'setup' });
    }
    return result;
  },
  readSync(fd, ...args) {
    let target;
    try { target = nativeFs.realpathSync('/proc/self/fd/' + fd); } catch {}
    let state = descriptors.get(fd);
    if (target === resourcePath && !state) {
      const phase = process.env.VIDA_CALLER_RESOURCE_PILOT_PHASE || 'setup';
      state = { held: !parked && phase === 'operation', phase, chunks: [], sidecarBefore: nativeFs.existsSync(sidecarPath) };
      descriptors.set(fd, state);
      if (state.held) {
        parked = true;
        emit({ kind: 'read-boundary', id, pid: process.pid, path: resourcePath,
          packageRoot,
          sidecarBefore: state.sidecarBefore, phase: state.phase });
        waitForRelease();
      }
    }
    const count = nativeFs.readSync(fd, ...args);
    if (state?.held && count > 0 && Buffer.isBuffer(args[0])) {
      const offset = typeof args[1] === 'number' ? args[1] : 0;
      state.chunks.push(Buffer.from(args[0].subarray(offset, offset + count)));
    }
    return count;
  },
  closeSync(fd) {
    const state = descriptors.get(fd);
    const result = nativeFs.closeSync(fd);
    if (state) {
      descriptors.delete(fd);
      if (state.held) {
        const bytes = Buffer.concat(state.chunks);
        emit({ kind: 'read-complete', id, pid: process.pid, path: resourcePath,
          bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
          sidecarBefore: state.sidecarBefore, sidecarAfter: nativeFs.existsSync(sidecarPath), phase: state.phase });
      }
    }
    return result;
  },
}));
emit({ kind: 'ready', id, pid: process.pid, packageRoot });
waitForRelease();
`;
    writeFileSync(preloadPath, preloadSource);

    type PilotEvent = { kind: string; [key: string]: unknown };
    type PilotState = {
      id: string;
      expectedCase: string;
      child: ReturnType<typeof spawn>;
      events: PilotEvent[];
      waiters: { kind: string; resolve: (event: PilotEvent) => void; reject: (error: Error) => void }[];
      stdout: Buffer[];
      stderr: Buffer[];
      stdoutBytes: number;
      stderrBytes: number;
      outputOverflow: boolean;
      childError: string | null;
      terminalObserved: boolean;
      observedTerminal: { closeObserved: boolean; exitCode: number | null; signal: string | null } | null;
      terminal: Promise<{ closeObserved: boolean; exitCode: number | null; signal: string | null }>;
      waitFor(kind: string): Promise<PilotEvent>;
    };
    const states: PilotState[] = [];
    const maxOutputBytes = 128 * 1024;
    const callers = [1, 2].map((index) => ({
      id: `configured-context-${index}`,
      file: 'tests/audit-package-context.test.ts',
      pattern: 'package context works without a copied bundle and ignores a consumer package-path collision',
      expectedCase: 'package context works without a copied bundle and ignores a consumer package-path collision',
    }));
    const publish = (state: PilotState, event: PilotEvent): void => {
      state.events.push(event);
      for (const waiter of [...state.waiters]) {
        if (waiter.kind !== event.kind) continue;
        state.waiters.splice(state.waiters.indexOf(waiter), 1);
        waiter.resolve(event);
      }
    };
    const killGroup = (state: PilotState): void => {
      if (state.child.pid === undefined) return;
      try {
        process.kill(-state.child.pid, 'SIGKILL');
      } catch {
        try {
          state.child.kill('SIGKILL');
        } catch (error) {
          state.childError ??= String(error);
        }
      }
    };
    const observe = (child: ReturnType<typeof spawn>, caller: (typeof callers)[number]): PilotState => {
      const state: PilotState = {
        id: caller.id,
        expectedCase: caller.expectedCase,
        child,
        events: [] as PilotEvent[],
        waiters: [] as PilotState['waiters'],
        stdout: [] as Buffer[],
        stderr: [] as Buffer[],
        stdoutBytes: 0,
        stderrBytes: 0,
        outputOverflow: false,
        childError: null as string | null,
        terminalObserved: false,
        observedTerminal: null as PilotState['observedTerminal'],
        terminal: Promise.resolve({ closeObserved: false, exitCode: null, signal: null as string | null }),
        waitFor(kind: string): Promise<PilotEvent> {
          const existing = state.events.find((event) => event.kind === kind);
          if (existing) return Promise.resolve(existing);
          return new Promise((resolve, reject) => state.waiters.push({ kind, resolve, reject }));
        },
      };
      let stdoutPending = '';
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => {
        const bytes = Buffer.from(chunk, 'utf8');
        if (state.stdoutBytes + bytes.length > maxOutputBytes) {
          state.outputOverflow = true;
          killGroup(state);
        } else {
          state.stdout.push(bytes);
          state.stdoutBytes += bytes.length;
        }
        stdoutPending += chunk;
        for (;;) {
          const end = stdoutPending.indexOf('\n');
          if (end < 0) break;
          const line = stdoutPending.slice(0, end);
          stdoutPending = stdoutPending.slice(end + 1);
          if (!line.startsWith(marker)) continue;
          try {
            const value: unknown = JSON.parse(line.slice(marker.length));
            if (isRecord(value) && typeof value.kind === 'string') publish(state, value as PilotEvent);
            else state.childError ??= 'malformed child observation';
          } catch {
            state.childError ??= 'malformed child observation JSON';
          }
        }
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        if (state.stderrBytes + chunk.length > maxOutputBytes) {
          state.outputOverflow = true;
          killGroup(state);
        } else {
          state.stderr.push(Buffer.from(chunk));
          state.stderrBytes += chunk.length;
        }
      });
      child.once('error', (error) => {
        state.childError ??= error.message;
        for (const waiter of state.waiters.splice(0)) waiter.reject(error);
      });
      child.stdin?.on('error', (error) => (state.childError ??= error.message));
      state.terminal = new Promise((resolve) =>
        child.once('close', (exitCode, signal) => {
          state.terminalObserved = true;
          state.observedTerminal = { closeObserved: true, exitCode, signal };
          if (stdoutPending && stdoutPending.startsWith(marker)) {
            try {
              const value: unknown = JSON.parse(stdoutPending.slice(marker.length));
              if (isRecord(value) && typeof value.kind === 'string') publish(state, value as PilotEvent);
            } catch {
              state.childError ??= 'malformed final child observation JSON';
            }
          }
          for (const waiter of state.waiters.splice(0))
            waiter.reject(new Error(`child ${state.id} closed before ${waiter.kind}`));
          resolve({ closeObserved: true, exitCode, signal });
        }),
      );
      states.push(state);
      return state;
    };
    const bounded = async <T>(promise: Promise<T>, label: string): Promise<T> => {
      const remaining = Math.floor(deadlineAt - performance.now() - 700);
      if (remaining <= 0) throw new Error(`Caller resource pilot deadline spent during ${label}`);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<T>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`Caller resource pilot deadline during ${label}`)), remaining);
          }),
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    };
    let cleanupAllowed = false;
    let pilotFailure: unknown;
    try {
      assertBeforeDeadline('child preparation');
      const selected = callers.map((caller) => {
        const child = spawn(
          process.execPath,
          [
            'test',
            '--parallel=1',
            '--no-isolate',
            '--timeout',
            '5000',
            '--reporter=junit',
            `--reporter-outfile=${path.join(outputRoot, `${caller.id}.junit.xml`)}`,
            '--test-name-pattern',
            caller.pattern,
            '--preload',
            preloadPath,
            caller.file,
          ],
          {
            cwd: packageRoot,
            env: {
              ...process.env,
              AGENT_RUNTIME_TEST_REPOSITORY_ROOT: sourceRoot,
              VIDA_CALLER_RESOURCE_PILOT_ID: caller.id,
              VIDA_CALLER_RESOURCE_PILOT_PHASE: 'setup',
            },
            detached: true,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        return { caller, state: observe(child, caller) };
      });
      for (const { state } of selected) {
        if (!state.child.stdin) throw new Error(`Caller ${state.id} has no command pipe`);
      }
      await bounded(Promise.all(states.map((state) => state.waitFor('ready'))), 'reader readiness');
      for (const state of states) state.child.stdin!.write('R');
      const boundaries = await bounded(
        Promise.all(states.map((state) => state.waitFor('read-boundary'))),
        'caller read boundaries',
      );
      for (const boundary of boundaries) {
        const state = states.find((entry) => entry.id === boundary.id);
        expect(state).toBeDefined();
        expect(boundary.path).toBe(sharedResource);
        expect(boundary.packageRoot).toBe(packageRoot);
        expect(boundary.sidecarBefore).toBe(false);
        expect(boundary.phase).toBe('operation');
        expect(boundary.pid).toBe(state?.child.pid);
      }
      const schemaReads = await bounded(
        Promise.all(states.map((state) => state.waitFor('schema-read'))),
        'setup schema observations',
      );
      for (let index = 0; index < states.length; index++) {
        const observation = schemaReads.find((event) => event.id === states[index]?.id);
        expect(observation).toMatchObject({
          pid: states[index]?.child.pid,
          path: expected[1]?.path,
          bytes: expected[1]?.bytes,
          sha256: expected[1]?.sha256,
          phase: 'setup',
        });
      }
      for (const state of states) state.child.stdin!.write('R');
      const completedReads = await bounded(
        Promise.all(states.map((state) => state.waitFor('read-complete'))),
        'verified read completion',
      );
      for (const observation of completedReads)
        expect(observation).toMatchObject({
          path: sharedResource,
          bytes: expected[0]?.bytes,
          sha256: expected[0]?.sha256,
          sidecarBefore: false,
          sidecarAfter: false,
          phase: 'operation',
        });
      const terminals = await bounded(Promise.all(states.map((state) => state.terminal)), 'native child terminals');
      for (let index = 0; index < states.length; index++) {
        const state = states[index];
        const terminal = terminals[index];
        const caller = callers[index];
        if (!state || !terminal || !caller || state.child.pid === undefined)
          throw new Error(`Caller child custody is incomplete at index ${index}`);
        const stdout = Buffer.concat(state.stdout);
        const stderr = Buffer.concat(state.stderr);
        const stdoutPath = path.join(outputRoot, `${caller.id}.stdout.log`);
        const stderrPath = path.join(outputRoot, `${caller.id}.stderr.log`);
        const junitPath = path.join(outputRoot, `${caller.id}.junit.xml`);
        writeFileSync(stdoutPath, stdout);
        writeFileSync(stderrPath, stderr);
        expect(new Set([stdoutPath, stderrPath, junitPath]).size).toBe(3);
        expect(existsSync(junitPath)).toBe(true);
        const junit = readFileSync(junitPath, 'utf8');
        const summary = junitOutcome(junit, [caller.file]);
        const testCases = [...junit.matchAll(/<testcase\b[^>]*?(?:\/>|>[\s\S]*?<\/testcase>)/g)].map(([row]) => row);
        const selectedNames = testCases.filter((row) => row.includes(caller.expectedCase));
        expect(terminal).toEqual({ closeObserved: true, exitCode: 0, signal: null });
        expect(state.childError).toBeNull();
        expect(state.outputOverflow).toBe(false);
        expect(summary.tests - summary.skipped).toBe(1);
        expect(summary.failures).toBe(0);
        expect(summary.errors).toBe(0);
        expect(testCases).toHaveLength(summary.tests);
        expect(selectedNames).toHaveLength(1);
        expect(selectedNames[0]).not.toMatch(/<(?:failure|error|skipped)\b/);
        for (const other of testCases.filter((row) => !row.includes(caller.expectedCase)))
          expect(other).toMatch(/<skipped\b/);
      }
      expect(sidecarPaths.map((target) => existsSync(target))).toEqual(sidecarsBefore);
      assertBeforeDeadline('final caller custody');
      cleanupAllowed = true;
    } catch (error) {
      pilotFailure = error;
      for (const state of states) {
        if (!state.terminalObserved) killGroup(state);
      }
      const remaining = Math.max(0, Math.min(600, Math.floor(deadlineAt - performance.now())));
      if (remaining > 0) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            Promise.all(states.map((state) => state.terminal)),
            new Promise((resolve) => {
              timer = setTimeout(resolve, remaining);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      }
      for (const state of states) {
        const caller = callers.find((entry) => entry.id === state.id);
        if (!caller) continue;
        writeFileSync(path.join(outputRoot, `${caller.id}.stdout.log`), Buffer.concat(state.stdout));
        writeFileSync(path.join(outputRoot, `${caller.id}.stderr.log`), Buffer.concat(state.stderr));
      }
      throw error;
    } finally {
      if (cleanupAllowed && performance.now() < deadlineAt) {
        rmSync(outputRoot, { recursive: true, force: true });
        expect(existsSync(outputRoot)).toBe(false);
      } else {
        const receipt = states.map((state) => ({
          id: state.id,
          pid: state.child.pid,
          terminal: state.observedTerminal,
          childError: state.childError,
          events: state.events,
        }));
        process.stderr.write(
          `Retained caller resource pilot root ${outputRoot}; failure=${String(pilotFailure)}; custody=${JSON.stringify(receipt)}\n`,
        );
      }
    }
  },
  { timeout: 10_000 },
);
