import { realpathSync } from 'node:fs';
import path from 'node:path';
import { dlopen, FFIType, ptr } from 'bun:ffi';
import type { ProcessCustody } from './mutation-evidence.ts';

export type WindowsJobEvidence = {
  schema: 'VidaWindowsJobObservation/v1';
  assigned_before_resume: boolean;
  creation_filetime: string | null;
  exit_filetime: string | null;
  active_processes: number | null;
  total_processes: number | null;
  observer_error: string | null;
};
export type WindowsOwnedGroup = {
  waitForEmpty(waitMs: number): Promise<boolean>;
  signal(signal: NodeJS.Signals): ProcessCustody['attempts'][number];
  closeIfSettled(): void;
  evidence(): WindowsJobEvidence;
  unref(): void;
};
export type WindowsOwnedChild = Pick<Bun.ReadableSubprocess, 'stdout' | 'stderr'> &
  Pick<Bun.Subprocess, 'pid' | 'exited' | 'signalCode' | 'kill' | 'unref'> & { nativeGroup: WindowsOwnedGroup };

const INVALID = 0xffffffffffffffffn;
const ERROR_BROKEN_PIPE = 109;
const MAX_PATH_CHARS = 32767;
const MAX_ENV_CHARS = 1_000_000;
type Handle = bigint;
type Api = ReturnType<typeof openKernel>['symbols'];
export class WindowsSpawnFailure extends Error {
  readonly custody: ProcessCustody & { native_job: WindowsJobEvidence };
  constructor(message: string, custody: ProcessCustody & { native_job: WindowsJobEvidence }) {
    super(message);
    this.name = 'WindowsSpawnFailure';
    this.custody = custody;
  }
}

function check(result: number | bigint, name: string, api: ReturnType<typeof openKernel>['symbols']): number | bigint {
  if (
    result === 0 ||
    result === 0n ||
    result === -1 ||
    result === -1n ||
    result === 0xffffffff ||
    result === 0xffffffffffffffffn
  ) {
    const code = api.GetLastError();
    throw new Error(`${name} failed (Win32 ${String(code)})`);
  }
  return result;
}
function wide(value: string): Uint8Array {
  if (value.includes('\0')) throw new Error('NUL is not allowed in a Windows string');
  const bytes = new Uint8Array((value.length + 1) * 2);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    bytes[i * 2] = code & 255;
    bytes[i * 2 + 1] = code >>> 8;
  }
  return bytes;
}
function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function readU64(bytes: Uint8Array, offset: number): bigint {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true);
}
function writeU64(bytes: Uint8Array, offset: number, value: bigint): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setBigUint64(offset, value, true);
}
function quoteArg(arg: string): string {
  if (arg.length > 0 && !/[\s"]/u.test(arg)) return arg;
  let out = '"';
  let slashes = 0;
  for (const ch of arg) {
    if (ch === '\\') {
      slashes++;
      continue;
    }
    if (ch === '"') {
      out += '\\'.repeat(slashes * 2 + 1) + '"';
      slashes = 0;
      continue;
    }
    out += '\\'.repeat(slashes) + ch;
    slashes = 0;
  }
  return out + '\\'.repeat(slashes * 2) + '"';
}
function environmentBlock(env: NodeJS.ProcessEnv): Uint8Array {
  const names = Object.keys(env).sort((a, b) => {
    const x = a.toUpperCase();
    const y = b.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const name of names) {
    const key = name.toUpperCase();
    if (seen.has(key)) throw new Error(`Case-colliding environment key: ${name}`);
    seen.add(key);
    const value = env[name];
    if (value === undefined) continue;
    if (name.includes('=') || name.includes('\0') || value.includes('\0')) throw new Error('Invalid environment entry');
    entries.push(`${name}=${value}`);
  }
  const data = `${entries.join('\0')}\0\0`;
  if (data.length > MAX_ENV_CHARS) throw new Error('Environment block exceeds configured bound');
  const bytes = new Uint8Array(data.length * 2);
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    bytes[i * 2] = code & 255;
    bytes[i * 2 + 1] = code >>> 8;
  }
  return bytes;
}
function systemKernel(): string {
  const root = process.env.SystemRoot;
  if (!root || !path.win32.isAbsolute(root)) throw new Error('SystemRoot is missing or invalid');
  const resolved = realpathSync.native(root);
  if (!path.win32.isAbsolute(resolved)) throw new Error('Resolved SystemRoot is invalid');
  return path.win32.join(resolved, 'System32', 'kernel32.dll');
}
function openKernel() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows x64 is required');
  return dlopen(systemKernel(), {
    CreateJobObjectW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.u64 },
    SetInformationJobObject: { args: [FFIType.u64, FFIType.u32, FFIType.ptr, FFIType.u32], returns: FFIType.i32 },
    CreatePipe: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32], returns: FFIType.i32 },
    SetHandleInformation: { args: [FFIType.u64, FFIType.u32, FFIType.u32], returns: FFIType.i32 },
    CreateFileW: {
      args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u64],
      returns: FFIType.u64,
    },
    InitializeProcThreadAttributeList: {
      args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.ptr],
      returns: FFIType.i32,
    },
    UpdateProcThreadAttribute: {
      args: [FFIType.ptr, FFIType.u32, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32,
    },
    DeleteProcThreadAttributeList: { args: [FFIType.ptr], returns: FFIType.void },
    CreateProcessW: {
      args: [
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.i32,
        FFIType.u32,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
        FFIType.ptr,
      ],
      returns: FFIType.i32,
    },
    GetLastError: { args: [], returns: FFIType.u32 },
    CloseHandle: { args: [FFIType.u64], returns: FFIType.i32 },
    ResumeThread: { args: [FFIType.u64], returns: FFIType.u32 },
    GetProcessId: { args: [FFIType.u64], returns: FFIType.u32 },
    GetProcessTimes: { args: [FFIType.u64, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
    IsProcessInJob: { args: [FFIType.u64, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
    QueryInformationJobObject: {
      args: [FFIType.u64, FFIType.u32, FFIType.ptr, FFIType.u32, FFIType.ptr],
      returns: FFIType.i32,
    },
    TerminateJobObject: { args: [FFIType.u64, FFIType.u32], returns: FFIType.i32 },
    TerminateProcess: { args: [FFIType.u64, FFIType.u32], returns: FFIType.i32 },
    WaitForSingleObject: { args: [FFIType.u64, FFIType.u32], returns: FFIType.u32 },
    GetExitCodeProcess: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
    PeekNamedPipe: {
      args: [FFIType.u64, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32,
    },
    ReadFile: { args: [FFIType.u64, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
  });
}
function processTimes(api: Api, processHandle: Handle): Uint8Array {
  const times = new Uint8Array(32);
  check(
    api.GetProcessTimes(
      processHandle,
      ptr(times.subarray(0, 8)),
      ptr(times.subarray(8, 16)),
      ptr(times.subarray(16, 24)),
      ptr(times.subarray(24, 32)),
    ),
    'GetProcessTimes',
    api,
  );
  return times;
}
let native: ReturnType<typeof openKernel> | undefined;
function getApi(): ReturnType<typeof openKernel>['symbols'] {
  native ??= openKernel();
  return native.symbols;
}
function handle(value: number | bigint, name: string): Handle {
  if (typeof value !== 'bigint' || value === 0n || value === INVALID)
    throw new Error(`${name} returned an invalid HANDLE`);
  return value;
}

function outputStream(
  api: Api,
  readHandle: Handle,
): { stream: ReadableStream<Uint8Array<ArrayBuffer>>; unref(): void } {
  let closed = false;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  let unrefCalled = false;
  const closeReadHandle = () => {
    if (closed) return;
    closed = true;
    if (api.CloseHandle(readHandle) === 0) throw new Error(`CloseHandle(pipe) failed (Win32 ${api.GetLastError()})`);
  };
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async pull(controller) {
      if (cancelled || closed) return;
      try {
        while (!cancelled && !closed) {
          const available = new Uint8Array(4);
          const peekOk = api.PeekNamedPipe(readHandle, null, 0, null, ptr(available), null);
          if (peekOk === 0) {
            const error = Number(api.GetLastError());
            if (error === ERROR_BROKEN_PIPE) {
              controller.close();
              closeReadHandle();
              return;
            }
            throw new Error(`PeekNamedPipe failed (Win32 ${error})`);
          }
          const count = readU32(available, 0);
          if (count > 0) {
            const buffer = new Uint8Array(Math.min(count, 65536));
            const bytesRead = new Uint8Array(4);
            if (api.ReadFile(readHandle, ptr(buffer), buffer.length, ptr(bytesRead), null) === 0) {
              const error = Number(api.GetLastError());
              if (error === ERROR_BROKEN_PIPE) {
                controller.close();
                closeReadHandle();
                return;
              }
              throw new Error(`ReadFile failed (Win32 ${error})`);
            }
            controller.enqueue(buffer.subarray(0, readU32(bytesRead, 0)));
            await new Promise<void>((resolve) => {
              wake = resolve;
              timer = setTimeout(() => {
                wake = undefined;
                timer = undefined;
                resolve();
              }, 0);
              if (unrefCalled) timer.unref();
            });
            return;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
            timer = setTimeout(() => {
              wake = undefined;
              timer = undefined;
              resolve();
            }, 5);
            if (unrefCalled) timer.unref();
          });
        }
      } catch (error) {
        controller.error(error);
        closeReadHandle();
      }
    },
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
      wake?.();
      wake = undefined;
      closeReadHandle();
    },
  });
  return {
    stream,
    unref() {
      unrefCalled = true;
      timer?.unref();
    },
  };
}

export async function spawnWindowsOwnedProcess(
  command: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  cleanupWaitMs: number,
): Promise<WindowsOwnedChild> {
  if (!Array.isArray(command) || command.length === 0 || command.some((arg) => arg.includes('\0')))
    throw new Error('A non-empty NUL-free command is required');
  const pathEntry = Object.entries(env).find(([key]) => key.toUpperCase() === 'PATH')?.[1] ?? '';
  const executable = command[0];
  if (!executable) throw new Error('A non-empty executable is required');
  const located = Bun.which(executable, { cwd, PATH: pathEntry });
  if (!located) throw new Error('Executable could not be resolved');
  const application = path.win32.resolve(located);
  if (!/\.(exe|com)$/iu.test(application)) throw new Error('Only .exe and .com executables are supported');
  const workingDirectory = path.win32.resolve(cwd);
  const line = command.map(quoteArg).join(' ');
  if (line.length + 1 > MAX_PATH_CHARS) throw new Error('Command line exceeds Windows limit');
  const appBytes = wide(application);
  const cwdBytes = wide(workingDirectory);
  const commandBytes = wide(line);
  const envBytes = environmentBlock(env);
  const api = getApi();
  let job: Handle = INVALID;
  let stdoutRead: Handle = INVALID;
  let stderrRead: Handle = INVALID;
  let stdoutWrite: Handle = INVALID;
  let stderrWrite: Handle = INVALID;
  let stdinHandle: Handle = INVALID;
  let processHandle: Handle = INVALID;
  let threadHandle: Handle = INVALID;
  let attrList: Uint8Array | undefined;
  let attrsInitialized = false;
  let handleList = new Uint8Array(24);
  let jobList = new Uint8Array(8);
  let stdoutOutput: ReturnType<typeof outputStream> | undefined;
  let stderrOutput: ReturnType<typeof outputStream> | undefined;
  let created = false;
  let pid = 0;
  let assigned = false;
  const close = (h: Handle) => {
    if (h !== INVALID && api.CloseHandle(h) === 0)
      throw new Error(`CloseHandle failed (Win32 ${String(api.GetLastError())})`);
  };
  const closeAll = (handles: Handle[]) => {
    const errors: string[] = [];
    for (const h of handles) {
      try {
        close(h);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'handle close failed');
      }
    }
    return errors;
  };
  const evidence: WindowsJobEvidence = {
    schema: 'VidaWindowsJobObservation/v1',
    assigned_before_resume: false,
    creation_filetime: null,
    exit_filetime: null,
    active_processes: null,
    total_processes: null,
    observer_error: null,
  };
  try {
    const sec = new Uint8Array(24);
    writeU32(sec, 0, 24);
    writeU32(sec, 16, 1);
    job = handle(check(api.CreateJobObjectW(null, null), 'CreateJobObjectW', api), 'CreateJobObjectW');
    const limits = new Uint8Array(144);
    writeU32(limits, 16, 0x2000);
    check(api.SetInformationJobObject(job, 9, ptr(limits), limits.length), 'SetInformationJobObject', api);
    const pipe = (readOut: Uint8Array, writeOut: Uint8Array) =>
      check(api.CreatePipe(ptr(readOut), ptr(writeOut), ptr(sec), 0), 'CreatePipe', api);
    const outPair = new Uint8Array(16);
    pipe(outPair.subarray(0, 8), outPair.subarray(8, 16));
    stdoutRead = readU64(outPair, 0);
    stdoutWrite = readU64(outPair, 8);
    const errPair = new Uint8Array(16);
    pipe(errPair.subarray(0, 8), errPair.subarray(8, 16));
    stderrRead = readU64(errPair, 0);
    stderrWrite = readU64(errPair, 8);
    check(api.SetHandleInformation(stdoutRead, 1, 0), 'SetHandleInformation(stdout)', api);
    check(api.SetHandleInformation(stderrRead, 1, 0), 'SetHandleInformation(stderr)', api);
    const nulName = wide('NUL');
    const openedInput = api.CreateFileW(ptr(nulName), 0x80000000, 3, ptr(sec), 3, 128, 0n);
    nulName.fill(0);
    stdinHandle = handle(openedInput, 'CreateFileW(NUL)');
    const sizeOut = new Uint8Array(8);
    const first = api.InitializeProcThreadAttributeList(null, 2, 0, ptr(sizeOut));
    if (first !== 0) throw new Error('InitializeProcThreadAttributeList unexpectedly accepted a null list');
    const required = readU64(sizeOut, 0);
    if (required < 64n || required > 65536n) throw new Error('Attribute-list size is outside its safe bound');
    attrList = new Uint8Array(Number(required));
    check(
      api.InitializeProcThreadAttributeList(ptr(attrList), 2, 0, ptr(sizeOut)),
      'InitializeProcThreadAttributeList',
      api,
    );
    attrsInitialized = true;
    writeU64(handleList, 0, stdinHandle);
    writeU64(handleList, 8, stdoutWrite);
    writeU64(handleList, 16, stderrWrite);
    check(
      api.UpdateProcThreadAttribute(ptr(attrList), 0, 0x20002, ptr(handleList), 24, null, null),
      'UpdateProcThreadAttribute(HANDLE_LIST)',
      api,
    );
    writeU64(jobList, 0, job);
    check(
      api.UpdateProcThreadAttribute(ptr(attrList), 0, 0x2000d, ptr(jobList), 8, null, null),
      'UpdateProcThreadAttribute(JOB_LIST)',
      api,
    );
    const startup = new Uint8Array(112);
    writeU32(startup, 0, 112);
    writeU32(startup, 60, 0x100);
    writeU64(startup, 80, stdinHandle);
    writeU64(startup, 88, stdoutWrite);
    writeU64(startup, 96, stderrWrite);
    writeU64(startup, 104, BigInt(0));
    const startupInfo = new Uint8Array(112);
    startupInfo.set(startup, 0);
    const attributeAddress = ptr(attrList);
    if (attributeAddress === null) throw new Error('Attribute-list pointer is null');
    writeU64(startupInfo, 104, BigInt(attributeAddress));
    const pi = new Uint8Array(24);
    const flags = 4 | 0x400 | 0x80000 | 0x08000000;
    check(
      api.CreateProcessW(
        ptr(appBytes),
        ptr(commandBytes),
        null,
        null,
        1,
        flags,
        ptr(envBytes),
        ptr(cwdBytes),
        ptr(startupInfo),
        ptr(pi),
      ),
      'CreateProcessW',
      api,
    );
    created = true;
    processHandle = readU64(pi, 0);
    threadHandle = readU64(pi, 8);
    pid = readU32(pi, 16);
    if (attrsInitialized) api.DeleteProcThreadAttributeList(ptr(attrList));
    handleList.fill(0);
    jobList.fill(0);
    attrsInitialized = false;
    attrList = undefined;
    const stdioCloseErrors = closeAll([stdoutWrite, stderrWrite, stdinHandle]);
    stdoutWrite = INVALID;
    stderrWrite = INVALID;
    stdinHandle = INVALID;
    if (stdioCloseErrors.length > 0) evidence.observer_error = stdioCloseErrors.join('; ');
    if (stdioCloseErrors.length > 0)
      throw new Error(`Could not close all parent stdio handles: ${stdioCloseErrors.join('; ')}`);
    const observedPid = Number(check(api.GetProcessId(processHandle), 'GetProcessId', api));
    if (observedPid !== pid) throw new Error('PROCESS_INFORMATION PID mismatch');
    const creationTimes = processTimes(api, processHandle);
    evidence.creation_filetime = readU64(creationTimes, 0).toString();
    const inJob = new Uint8Array(4);
    check(api.IsProcessInJob(processHandle, job, ptr(inJob)), 'IsProcessInJob', api);
    if (readU32(inJob, 0) !== 1) throw new Error('Child is not in the owned job');
    assigned = true;
    evidence.assigned_before_resume = true;
    const accounting = new Uint8Array(48);
    check(api.QueryInformationJobObject(job, 1, ptr(accounting), 48, null), 'QueryInformationJobObject', api);
    evidence.total_processes = readU32(accounting, 36);
    evidence.active_processes = readU32(accounting, 40);
    if (evidence.active_processes < 1) throw new Error('Owned job has no active process before resume');
    if (api.ResumeThread(threadHandle) !== 1) throw new Error('ResumeThread did not resume the suspended child');
    close(threadHandle);
    threadHandle = INVALID;
    const output = outputStream(api, stdoutRead);
    const errorOutput = outputStream(api, stderrRead);
    stdoutOutput = output;
    stderrOutput = errorOutput;
    let ended = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unrefCalled = false;
    let observedExit: number | null = null;
    let settleExit: ((code: number) => void) | undefined;
    const waitProcess = (): number => {
      const status = api.WaitForSingleObject(processHandle, 0);
      if (status === 0xffffffff) throw new Error(`WaitForSingleObject failed (Win32 ${String(api.GetLastError())})`);
      return status;
    };
    const observeExitNow = (): void => {
      if (ended || waitProcess() !== 0) return;
      const code = new Uint8Array(4);
      const exitTime = new Uint8Array(8);
      check(api.GetExitCodeProcess(processHandle, ptr(code)), 'GetExitCodeProcess', api);
      const processTimeBytes = processTimes(api, processHandle);
      exitTime.set(processTimeBytes.subarray(8, 16));
      evidence.exit_filetime = readU64(exitTime, 0).toString();
      observedExit = readU32(code, 0);
      ended = true;
      settleExit?.(observedExit);
    };
    const exited = new Promise<number>((resolve, reject) => {
      settleExit = resolve;
      const poll = () => {
        if (ended) return;
        try {
          observeExitNow();
          if (ended) return;
          timer = setTimeout(poll, 5);
          if (unrefCalled) timer.unref();
        } catch (error) {
          evidence.observer_error = error instanceof Error ? error.message : 'process observer error';
          ended = true;
          reject(error);
        }
      };
      poll();
    });
    void exited.catch(() => undefined);
    const custody: ProcessCustody = {
      pid,
      scope: 'owned-process-group',
      terminationObserved: false,
      processGroupTerminationObserved: null,
      unrefCalled: false,
      attempts: [],
    };
    const queryActive = (): number => {
      const accountingNow = new Uint8Array(48);
      check(api.QueryInformationJobObject(job, 1, ptr(accountingNow), 48, null), 'QueryInformationJobObject', api);
      evidence.total_processes = readU32(accountingNow, 36);
      evidence.active_processes = readU32(accountingNow, 40);
      return evidence.active_processes;
    };
    const group: WindowsOwnedGroup = {
      async waitForEmpty(waitMs) {
        try {
          observeExitNow();
        } catch (error) {
          evidence.observer_error = error instanceof Error ? error.message : 'direct process observer failed';
        }
        const deadline = Date.now() + Math.max(0, waitMs);
        while (true) {
          try {
            if (queryActive() === 0) {
              observeExitNow();
              custody.processGroupTerminationObserved = true;
              return true;
            }
          } catch (error) {
            evidence.observer_error = error instanceof Error ? error.message : 'job observer error';
          }
          if (Date.now() >= deadline) {
            custody.processGroupTerminationObserved = false;
            return false;
          }
          await new Promise<void>((resolve) => {
            const waitTimer = setTimeout(resolve, Math.min(5, deadline - Date.now()));
            if (unrefCalled) waitTimer.unref();
          });
        }
      },
      signal(signal) {
        const exit = signal === 'SIGKILL' ? 137 : signal === 'SIGINT' ? 130 : signal === 'SIGQUIT' ? 131 : 143;
        try {
          if (api.TerminateJobObject(job, exit) === 0)
            throw new Error(`TerminateJobObject failed (Win32 ${String(api.GetLastError())})`);
          const attempt = { signal, target: 'process-group' as const, outcome: 'sent' };
          custody.attempts.push(attempt);
          return attempt;
        } catch (error) {
          const attempt = {
            signal,
            target: 'process-group' as const,
            outcome: 'failed',
            error: error instanceof Error ? error.message : 'TerminateJobObject failed',
          };
          custody.attempts.push(attempt);
          return attempt;
        }
      },
      closeIfSettled() {
        if (observedExit === null || evidence.active_processes !== 0 || !assigned)
          throw new Error('Owned process group is not positively settled');
        close(job);
        job = INVALID;
        close(processHandle);
        processHandle = INVALID;
      },
      evidence() {
        return { ...evidence };
      },
      unref() {
        unrefCalled = true;
        custody.unrefCalled = true;
        if (timer) timer.unref();
        output.unref();
        errorOutput.unref();
      },
    };
    return {
      stdout: output.stream,
      stderr: errorOutput.stream,
      pid,
      exited,
      get signalCode() {
        return null;
      },
      kill(signal?: NodeJS.Signals | number) {
        group.signal(typeof signal === 'string' ? signal : 'SIGTERM');
      },
      unref() {
        group.unref();
      },
      nativeGroup: group,
    };
  } catch (error) {
    if (!created) {
      const cleanupErrors = closeAll([stdoutRead, stderrRead, stdoutWrite, stderrWrite, stdinHandle, job]);
      if (attrList && attrsInitialized) {
        try {
          api.DeleteProcThreadAttributeList(ptr(attrList));
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError instanceof Error ? cleanupError.message : 'attribute-list cleanup failed');
        }
      }
      if (cleanupErrors.length > 0)
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Spawn setup failed and some owned resources could not be closed',
        );
      throw error;
    }
    let directExit = false;
    let groupEmpty = false;
    const stdioCloseErrors = closeAll([stdoutWrite, stderrWrite, stdinHandle]);
    stdoutWrite = INVALID;
    stderrWrite = INVALID;
    stdinHandle = INVALID;
    if (stdioCloseErrors.length > 0) evidence.observer_error = stdioCloseErrors.join('; ');
    let terminateSent = false;
    try {
      terminateSent = api.TerminateJobObject(job, 137) !== 0;
    } catch {
      evidence.observer_error = 'TerminateJobObject failed during spawn cleanup';
    }
    if (processHandle !== INVALID) {
      try {
        if (api.TerminateProcess(processHandle, 137) === 0)
          evidence.observer_error = 'TerminateProcess failed for retained child handle';
      } catch {
        evidence.observer_error = 'TerminateProcess failed for retained child handle';
      }
    }
    const deadline = Date.now() + Math.max(0, cleanupWaitMs);
    while (Date.now() <= deadline && (!directExit || !groupEmpty)) {
      try {
        const result = api.WaitForSingleObject(processHandle, 0);
        if (result === 0xffffffff) throw new Error('WAIT_FAILED');
        directExit = directExit || result === 0;
      } catch {
        evidence.observer_error = 'direct process wait failed';
      }
      try {
        const accounting = new Uint8Array(48);
        check(
          api.QueryInformationJobObject(job, 1, ptr(accounting), 48, null),
          'QueryInformationJobObject(cleanup)',
          api,
        );
        evidence.total_processes = readU32(accounting, 36);
        evidence.active_processes = readU32(accounting, 40);
        groupEmpty = evidence.active_processes === 0;
      } catch {
        evidence.observer_error = 'job active-process query failed';
      }
      if (!directExit || !groupEmpty) await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    if (directExit) {
      try {
        evidence.exit_filetime = readU64(processTimes(api, processHandle), 8).toString();
      } catch {
        evidence.observer_error = 'exit time observation failed';
      }
    }
    if (directExit && groupEmpty) {
      if (stdoutOutput) {
        try {
          await stdoutOutput.stream.cancel();
          stdoutRead = INVALID;
        } catch {
          evidence.observer_error = 'stdout reader cancellation failed';
        }
      }
      if (stderrOutput) {
        try {
          await stderrOutput.stream.cancel();
          stderrRead = INVALID;
        } catch {
          evidence.observer_error = 'stderr reader cancellation failed';
        }
      }
      const closeErrors = closeAll([
        threadHandle,
        processHandle,
        job,
        stdoutRead,
        stderrRead,
        stdoutWrite,
        stderrWrite,
        stdinHandle,
      ]);
      if (closeErrors.length > 0) evidence.observer_error = closeErrors.join('; ');
    }
    const custody: ProcessCustody & { native_job: WindowsJobEvidence } = {
      pid,
      scope: 'owned-process-group',
      terminationObserved: directExit,
      processGroupTerminationObserved: groupEmpty,
      unrefCalled: true,
      attempts: terminateSent
        ? [{ signal: 'SIGKILL', target: 'process-group', outcome: 'sent' }]
        : [
            {
              signal: 'SIGKILL',
              target: 'process-group',
              outcome: 'failed',
              error: evidence.observer_error ?? 'TerminateJobObject returned false',
            },
          ],
      native_job: { ...evidence },
    };
    throw new WindowsSpawnFailure(
      error instanceof Error ? error.message : 'Windows spawn failed after process creation',
      custody,
    );
  }
}
