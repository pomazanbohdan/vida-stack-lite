import type { ChildProcess, SpawnSyncReturns } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';

type ChildApis = Pick<typeof import('node:child_process'), 'spawn' | 'spawnSync'>;
type Options = { runId: string; parentPid: number; fixtureFingerprint: string; maxOutputBytes: number };
type Output = { representation: string; bytes: number; sha256: string; truncated: boolean; available: boolean };
type FileIdentity = { path: string; witness: string; sha256: string };
type ChildObservation = {
  id: number;
  command: string;
  argv: string[];
  cwd: string;
  environment_sha256: string;
  executable_path: string;
  executable_sha256: string;
  entrypoint: { kind: 'inline' | 'file' | 'none'; value_sha256: string; path: string };
  pid: number | null;
  exit_code: number | null;
  signal: string | null;
  termination_request: string | null;
  terminal_observed: boolean;
  error_observed: boolean;
  inputs_stable: boolean;
  stdout: Output;
  stderr: Output;
};
export type FixtureChildProof = {
  schema: 'PublishedFixtureChildren/v1';
  scope: 'direct-child-process-api';
  run_id: string;
  parent_pid: number;
  fixture_fingerprint: string;
  launch_count: number;
  unsupported_calls: number;
  complete: boolean;
  children: ChildObservation[];
};

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const witness = (value: NonNullable<ReturnType<typeof statSync>>) =>
  [value.dev, value.ino, value.size, value.mtimeMs, value.ctimeMs].join(':');
const emptyOutput = (): Output => ({
  representation: 'unavailable',
  bytes: 0,
  sha256: '',
  truncated: false,
  available: false,
});

/** Observe the original APIs without changing commands, environment, return values or stream flow. */
export function createFixtureChildObserver(actual: ChildApis, options: Options) {
  if (
    !options.runId ||
    !Number.isSafeInteger(options.parentPid) ||
    options.parentPid < 1 ||
    !/^[0-9a-f]{64}$/u.test(options.fixtureFingerprint) ||
    !Number.isSafeInteger(options.maxOutputBytes) ||
    options.maxOutputBytes < 0
  )
    throw new Error('Fixture child observation identity or bounds are invalid.');
  const children: ChildObservation[] = [];
  const files = new Map<string, FileIdentity>();
  // Bun mock.module updates live builtin exports. Hold the original functions
  // before interception so delegating never recurses through that namespace.
  const originalSpawn = actual.spawn;
  const originalSpawnSync = actual.spawnSync;
  let unsupportedCalls = 0;
  const unsupportedApis: Record<string, (...call: unknown[]) => unknown> = {};
  for (const name of ['exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    const original: unknown = Reflect.get(actual, name);
    if (typeof original === 'function')
      unsupportedApis[name] = (...call: unknown[]) => {
        unsupportedCalls++;
        return Reflect.apply(original, actual, call);
      };
  }

  function fileIdentity(file: string): FileIdentity {
    const resolved = realpathSync(file);
    const before = statSync(resolved);
    if (!before.isFile() || before.size > 256 * 1024 * 1024)
      throw new Error('Child input is not a bounded regular file.');
    const key = witness(before);
    const cached = files.get(resolved);
    if (cached?.witness === key) return cached;
    const fd = openSync(resolved, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      if (witness(fstatSync(fd)) !== key) throw new Error('Child input changed before capture.');
      const digest = createHash('sha256');
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let count = 0;
      for (;;) {
        const size = readSync(fd, buffer, 0, buffer.length, null);
        if (size === 0) break;
        count += size;
        if (count > before.size) throw new Error('Child input grew during capture.');
        digest.update(buffer.subarray(0, size));
      }
      if (count !== before.size || witness(fstatSync(fd)) !== key || witness(statSync(resolved)) !== key)
        throw new Error('Child input changed during capture.');
      const identity = { path: resolved, witness: key, sha256: digest.digest('hex') };
      files.set(resolved, identity);
      return identity;
    } finally {
      closeSync(fd);
    }
  }

  function prepare(call: unknown[]) {
    const rawOptions = Array.isArray(call[1]) ? call[2] : call[1];
    const settings = rawOptions === undefined ? {} : rawOptions;
    const row: ChildObservation = {
      id: children.length + 1,
      command: typeof call[0] === 'string' ? call[0] : '',
      argv: [],
      cwd: '',
      environment_sha256: '',
      executable_path: '',
      executable_sha256: '',
      entrypoint: { kind: 'none', value_sha256: '', path: '' },
      pid: null,
      exit_code: null,
      signal: null,
      termination_request: null,
      terminal_observed: false,
      error_observed: false,
      inputs_stable: false,
      stdout: emptyOutput(),
      stderr: emptyOutput(),
    };
    children.push(row);
    const identities: FileIdentity[] = [];
    try {
      if (!row.command || !record(settings)) throw new Error('Unobservable child command.');
      if (Array.isArray(call[1])) {
        const argv: unknown[] = call[1];
        if (!argv.every((item): item is string => typeof item === 'string'))
          throw new Error('Unobservable child arguments.');
        row.argv = [...argv];
      }
      if (settings.shell) throw new Error('Shell execution is not a direct executable proof.');
      if (settings.cwd !== undefined && typeof settings.cwd !== 'string') throw new Error('Unobservable child cwd.');
      row.cwd = path.resolve(typeof settings.cwd === 'string' ? settings.cwd : process.cwd());
      const env = settings.env ?? process.env;
      if (!record(env) || Object.values(env).some((value) => value !== undefined && typeof value !== 'string'))
        throw new Error('Unobservable child environment.');
      row.environment_sha256 = hash(
        JSON.stringify(
          Object.keys(env)
            .filter((key) => env[key] !== undefined)
            .sort()
            .map((key) => [key, env[key]]),
        ),
      );
      const executable =
        row.command.includes('/') || row.command.includes('\\')
          ? path.resolve(row.cwd, row.command)
          : Bun.which(row.command, { cwd: row.cwd, PATH: typeof env.PATH === 'string' ? env.PATH : '' });
      if (!executable) throw new Error('Child executable was not resolved.');
      const identity = fileIdentity(executable);
      identities.push(identity);
      row.executable_path = identity.path;
      row.executable_sha256 = identity.sha256;
      // This protocol supports the fixed fixture interpreter forms, not arbitrary
      // preload/loader flags. Program arguments remain bound by the exact argv.
      for (let index = 0; index < row.argv.length; index++) {
        const argument = row.argv[index];
        if (argument === '--no-env-file' || argument === '--no-install') continue;
        if (argument === '-e' || argument === '--eval') {
          const code = row.argv[index + 1];
          if (code === undefined) throw new Error('Child inline entrypoint is missing.');
          row.entrypoint = { kind: 'inline', value_sha256: hash(code), path: '' };
          break;
        }
        if (!argument || argument.startsWith('-'))
          throw new Error('Child interpreter options are outside the fixture protocol.');
        const entry = fileIdentity(path.resolve(row.cwd, argument));
        identities.push(entry);
        row.entrypoint = { kind: 'file', value_sha256: entry.sha256, path: entry.path };
        break;
      }
      row.inputs_stable = true;
    } catch {
      row.inputs_stable = false;
    }
    function terminal() {
      row.terminal_observed = true;
      try {
        row.inputs_stable &&= identities.every(
          (item) => realpathSync(item.path) === item.path && witness(statSync(item.path)) === item.witness,
        );
      } catch {
        row.inputs_stable = false;
      }
    }
    return { row, settings, terminal };
  }

  function returnedOutput(value: unknown, encoding: unknown): Output {
    let representation: string;
    let bytes: Uint8Array;
    if (value instanceof Uint8Array) {
      representation = 'returned-bytes';
      bytes = value;
    } else if (typeof value === 'string' && (encoding === 'utf8' || encoding === 'utf-8')) {
      representation = 'returned-text-utf8';
      bytes = Buffer.from(value, 'utf8');
    } else return emptyOutput();
    const truncated = bytes.byteLength > options.maxOutputBytes;
    return {
      representation,
      bytes: bytes.byteLength,
      sha256: truncated ? '' : hash(bytes),
      truncated,
      available: true,
    };
  }

  function observeStream(stream: Readable | null, row: ChildObservation, key: 'stdout' | 'stderr') {
    if (!stream) return;
    const output: Output = (row[key] = {
      representation: 'emitted-bytes',
      bytes: 0,
      sha256: hash(''),
      truncated: false,
      available: false,
    });
    const digest = createHash('sha256');
    let invalid = false;
    const emit = Reflect.get(stream, 'emit') as Readable['emit'];
    stream.emit = function (event: string | symbol, ...args: unknown[]) {
      if (event === 'data') {
        const chunk = args[0];
        if (chunk instanceof Uint8Array) {
          output.bytes += chunk.byteLength;
          if (output.bytes > options.maxOutputBytes) {
            output.truncated = true;
            output.sha256 = '';
          } else if (!invalid) {
            digest.update(chunk);
            output.sha256 = digest.copy().digest('hex');
          }
        } else {
          invalid = true;
          output.available = false;
          output.sha256 = '';
        }
      }
      if (event === 'end') output.available = !invalid;
      return Reflect.apply(emit, this, [event, ...args]);
    };
  }

  function spawnSync(...call: unknown[]): SpawnSyncReturns<string | Buffer> {
    const context = prepare(call);
    let result: SpawnSyncReturns<string | Buffer>;
    try {
      result = Reflect.apply(originalSpawnSync, actual, call) as SpawnSyncReturns<string | Buffer>;
    } catch (error) {
      context.row.error_observed = true;
      throw error;
    }
    context.row.pid = result.pid > 0 ? result.pid : null;
    context.row.exit_code = result.status;
    context.row.signal = result.signal;
    context.row.error_observed = result.error !== undefined;
    const encoding = record(context.settings) ? context.settings.encoding : undefined;
    context.row.stdout = returnedOutput(result.stdout, encoding);
    context.row.stderr = returnedOutput(result.stderr, encoding);
    context.terminal();
    return result;
  }

  function spawn(...call: unknown[]): ChildProcess {
    const context = prepare(call);
    let child: ChildProcess;
    try {
      child = Reflect.apply(originalSpawn, actual, call) as ChildProcess;
    } catch (error) {
      context.row.error_observed = true;
      throw error;
    }
    context.row.pid = child.pid ?? null;
    observeStream(child.stdout, context.row, 'stdout');
    observeStream(child.stderr, context.row, 'stderr');
    const kill = Reflect.get(child, 'kill') as ChildProcess['kill'];
    child.kill = function (signal?: NodeJS.Signals | number) {
      const accepted = Reflect.apply(kill, this, [signal]);
      if (accepted === true && (signal === undefined || signal === 'SIGTERM' || signal === 'SIGKILL'))
        context.row.termination_request = signal ?? 'SIGTERM';
      return accepted;
    };
    const emit = Reflect.get(child, 'emit') as ChildProcess['emit'];
    child.emit = function (event: string | symbol, ...args: unknown[]) {
      if (event === 'error') context.row.error_observed = true;
      if (event === 'close') {
        context.row.exit_code = typeof args[0] === 'number' ? args[0] : null;
        context.row.signal = typeof args[1] === 'string' ? args[1] : null;
        context.terminal();
      }
      return Reflect.apply(emit, this, [event, ...args]);
    };
    return child;
  }

  return {
    apis: { ...unsupportedApis, spawn, spawnSync },
    finish(): FixtureChildProof {
      return {
        schema: 'PublishedFixtureChildren/v1',
        scope: 'direct-child-process-api',
        run_id: options.runId,
        parent_pid: options.parentPid,
        fixture_fingerprint: options.fixtureFingerprint,
        launch_count: children.length,
        unsupported_calls: unsupportedCalls,
        complete:
          unsupportedCalls === 0 &&
          children.length <= 256 &&
          children.every(
            (child) =>
              child.inputs_stable &&
              child.terminal_observed &&
              ((child.exit_code !== null && child.signal === null) ||
                (child.exit_code === null &&
                  child.termination_request !== null &&
                  child.signal === child.termination_request)) &&
              child.pid !== null &&
              child.pid > 0 &&
              !child.error_observed &&
              child.stdout.available &&
              child.stderr.available &&
              !child.stdout.truncated &&
              !child.stderr.truncated,
          ),
        children: children.map((child) => ({
          ...child,
          argv: [...child.argv],
          entrypoint: { ...child.entrypoint },
          stdout: { ...child.stdout },
          stderr: { ...child.stderr },
        })),
      };
    },
  };
}

/** Capture completeness only. Fixture tests own expected nonzero subject outcomes;
 * this proof never grants coverage, mutation, release or operational authority. */
export function assertFixtureChildProof(value: unknown, expected: Options): void {
  const fail = () => {
    throw new Error('Published fixture child observation is missing, incomplete or unbound.');
  };
  const keys = (item: Record<string, unknown>, names: string) => Object.keys(item).sort().join(',') === names;
  const digest = (item: unknown): item is string => typeof item === 'string' && /^[0-9a-f]{64}$/u.test(item);
  const natural = (item: unknown): item is number =>
    typeof item === 'number' && Number.isSafeInteger(item) && item >= 0;
  const absolute = (item: unknown): item is string =>
    typeof item === 'string' && path.isAbsolute(item) && !item.includes('\0');
  if (
    !record(value) ||
    !keys(
      value,
      'children,complete,fixture_fingerprint,launch_count,parent_pid,run_id,schema,scope,unsupported_calls',
    ) ||
    value.schema !== 'PublishedFixtureChildren/v1' ||
    value.scope !== 'direct-child-process-api' ||
    value.complete !== true ||
    value.unsupported_calls !== 0 ||
    value.run_id !== expected.runId ||
    value.parent_pid !== expected.parentPid ||
    value.fixture_fingerprint !== expected.fixtureFingerprint ||
    !Array.isArray(value.children) ||
    !natural(value.launch_count) ||
    value.launch_count !== value.children.length ||
    value.launch_count > 256
  )
    fail();
  if (!record(value) || !Array.isArray(value.children)) return fail();
  const children: unknown[] = value.children;
  const seenPids = new Set<number>();
  for (const [index, child] of children.entries()) {
    if (
      !record(child) ||
      !keys(
        child,
        'argv,command,cwd,entrypoint,environment_sha256,error_observed,executable_path,executable_sha256,exit_code,id,inputs_stable,pid,signal,stderr,stdout,terminal_observed,termination_request',
      ) ||
      child.id !== index + 1 ||
      typeof child.command !== 'string' ||
      !child.command ||
      !Array.isArray(child.argv) ||
      !(child.argv as unknown[]).every((arg) => typeof arg === 'string' && !arg.includes('\0')) ||
      !absolute(child.cwd) ||
      !absolute(child.executable_path) ||
      !digest(child.executable_sha256) ||
      !digest(child.environment_sha256) ||
      !natural(child.pid) ||
      child.pid === 0 ||
      child.pid === expected.parentPid ||
      seenPids.has(child.pid) ||
      !(
        (natural(child.exit_code) &&
          child.exit_code <= 255 &&
          child.signal === null &&
          (child.termination_request === null ||
            child.termination_request === 'SIGTERM' ||
            child.termination_request === 'SIGKILL')) ||
        (child.exit_code === null &&
          (child.signal === 'SIGTERM' || child.signal === 'SIGKILL') &&
          child.signal === child.termination_request)
      ) ||
      child.error_observed !== false ||
      child.terminal_observed !== true ||
      child.inputs_stable !== true
    )
      fail();
    if (!record(child) || typeof child.pid !== 'number') return fail();
    seenPids.add(child.pid);
    const entry = child.entrypoint;
    if (
      !record(entry) ||
      !keys(entry, 'kind,path,value_sha256') ||
      !(
        (entry.kind === 'inline' && entry.path === '' && digest(entry.value_sha256)) ||
        (entry.kind === 'file' && absolute(entry.path) && digest(entry.value_sha256)) ||
        (entry.kind === 'none' && entry.path === '' && entry.value_sha256 === '')
      )
    )
      fail();
    for (const output of [child.stdout, child.stderr]) {
      if (
        !record(output) ||
        !keys(output, 'available,bytes,representation,sha256,truncated') ||
        output.available !== true ||
        output.truncated !== false ||
        !['returned-text-utf8', 'returned-bytes', 'emitted-bytes'].includes(
          typeof output.representation === 'string' ? output.representation : '',
        ) ||
        !natural(output.bytes) ||
        output.bytes > expected.maxOutputBytes ||
        !digest(output.sha256)
      )
        fail();
    }
  }
}
