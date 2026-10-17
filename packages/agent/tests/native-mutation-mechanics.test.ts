import { expect, test } from 'bun:test';
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { executionBudget } from '../bin/bun.ts';
import { nativeMutationMechanicsWorkerCommand } from '../tooling/mutation-batch-pilot.ts';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { campaignProcessState } from '../tooling/contour-campaign.ts';

const workerSource = `
import { readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const id=process.env.WORKER_ID;
const mode=process.env.WORKER_MODE;
const output=mode==='overlay'?process.env.REPORT_DIRECTORY:process.env.WORKER_OUTPUT;
const denied=[];
for(const file of [process.env.SHARED_INPUT,process.env.SHARED_DESCRIPTOR,'subject.ts',path.join(process.env.WORKER_SIBLING,'forbidden')]){
  try{writeFileSync(file,'changed')}catch(error){if(error.code==='EROFS'||error.code==='EACCES'||(mode==='overlay'&&error.code==='ENOENT'))denied.push(file);else throw error}
}
writeFileSync('.tmp/owned',id);
writeFileSync('/tmp/owned',id);
const observed={id,pid:process.pid,pid1:readFileSync('/proc/1/comm','utf8').trim(),namespace:readlinkSync('/proc/self/ns/pid'),
  ...(mode==='overlay'?{report:output,cwd:process.cwd()}:{}),
  denied:denied.length,input:readFileSync(process.env.SHARED_INPUT,'utf8'),scratch:readFileSync('.tmp/owned','utf8'),
  temporary:readFileSync('/tmp/owned','utf8'),cache:process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH};
if(mode==='descendant'){
  const child=Bun.spawn([process.execPath,'--no-env-file','--no-install','tooling/descendant.ts'],{detached:true,stdout:'ignore',stderr:'ignore'});
  child.unref();
  while(!await Bun.file(path.join(output,'descendant-ready')).exists())await Bun.sleep(5);
}
writeFileSync(path.join(output,'ready.json'),JSON.stringify(observed));
console.log(JSON.stringify(observed));
console.error('worker-stderr:'+id);
if(mode==='signal')process.kill(process.pid,'SIGTERM');
if(mode==='hang')await new Promise(()=>setInterval(()=>{},1000));
while(!await Bun.file(path.join(output,'go')).exists())await Bun.sleep(5);
writeFileSync(path.join(output,'done'),id);
`;

function fixture(storage = tmpdir()) {
  const repositoryRoot = mkdtempSync(path.join(storage, 'native-mutation-mechanics-'));
  const directory = path.join(repositoryRoot, '.tmp/operation');
  const sandbox = path.join(directory, 'inputs/sandbox');
  mkdirSync(path.join(sandbox, 'tooling'), { recursive: true });
  mkdirSync(path.join(sandbox, '.tmp'));
  const sharedInput = path.join(repositoryRoot, 'input.txt');
  const sharedDescriptor = path.join(directory, 'fixture.inputs.json');
  writeFileSync(sharedInput, 'immutable input');
  writeFileSync(sharedDescriptor, '{"immutable":true}');
  writeFileSync(path.join(sandbox, 'subject.ts'), 'export const value = 1;\n');
  writeFileSync(
    path.join(sandbox, 'tooling/mutation-command-runner.ts'),
    workerSource + '\n/*' + 'x'.repeat(5000) + '*/',
  );
  writeFileSync(
    path.join(sandbox, 'tooling/descendant.ts'),
    `
    await Bun.write(process.env.WORKER_OUTPUT+'/descendant-ready',JSON.stringify({pid:process.pid}));
    setInterval(()=>{},1000);
  `,
  );
  const outputs = ['first', 'second'].map((id) => {
    const output = path.join(directory, 'outputs', id);
    for (const leaf of ['scratch', 'tmp/bun-install-cache']) mkdirSync(path.join(output, leaf), { recursive: true });
    return output;
  });
  const bwrap = Bun.which('bwrap');
  const tini = Bun.which('tini');
  if (!bwrap || !tini) throw new Error('Native mechanics controls require bwrap and tini.');
  return { repositoryRoot, directory, sandbox, sharedInput, sharedDescriptor, outputs, bwrap, tini };
}

function commands(current: ReturnType<typeof fixture>) {
  return current.outputs.map((outputRoot) =>
    nativeMutationMechanicsWorkerCommand({
      bwrap: current.bwrap,
      tini: current.tini,
      executable: process.execPath,
      repositoryRoot: current.repositoryRoot,
      sandbox: current.sandbox,
      outputRoot,
    }),
  );
}

function launch(
  current: ReturnType<typeof fixture>,
  prepared: string[],
  index: number,
  mode: string,
  budget: ReturnType<typeof executionBudget>,
  maximumMs = 1500,
) {
  const output = current.outputs[index]!;
  return executeMutationCommand(prepared, current.sandbox, budget.remaining(maximumMs), {
    ownedProcessGroup: true,
    terminationGraceMs: 300,
    forceWaitMs: 300,
    stdoutFile: path.join(output, 'stdout.log'),
    stderrFile: path.join(output, 'stderr.log'),
    env: {
      ...process.env,
      WORKER_ID: String(index),
      WORKER_MODE: mode,
      WORKER_OUTPUT: output,
      WORKER_SIBLING: current.outputs[1 - index],
      SHARED_INPUT: current.sharedInput,
      SHARED_DESCRIPTOR: current.sharedDescriptor,
      REPORT_DIRECTORY: current.directory,
    },
  }).then((result) => {
    writeFileSync(path.join(output, 'execution.json'), JSON.stringify(result));
    return result;
  });
}

async function waitForFile(file: string): Promise<void> {
  const deadline = performance.now() + 1000;
  while (!existsSync(file)) {
    if (performance.now() >= deadline) throw new Error('Native mechanics handshake did not arrive.');
    await Bun.sleep(5);
  }
}

test.each([tmpdir(), '/dev/shm'])(
  'two native mechanics workers isolate resources and disable disposable transpiler caches under %s',
  async (storage) => {
    const current = fixture(storage);
    const prepared = commands(current);
    const budget = executionBudget(4000, 300);
    const pending = prepared.map((command, index) => launch(current, command, index, 'hold', budget));
    let complete = false;
    try {
      await Promise.all(current.outputs.map((output) => waitForFile(path.join(output, 'ready.json'))));
      for (const output of current.outputs) writeFileSync(path.join(output, 'go'), 'release');
      const outcomes = await Promise.all(pending);
      const namespaces: string[] = [];
      for (const [index, outcome] of outcomes.entries()) {
        expect(outcome.exitCode).toBe(0);
        expect(outcome.signal).toBeNull();
        expect(outcome.spawnError).toBeNull();
        expect(outcome.timedOut).toBe(false);
        expect(outcome.output_capture?.complete).toBe(true);
        expect(outcome.processCustody?.processGroupTerminationObserved).toBe(true);
        const output = current.outputs[index]!;
        const observation: unknown = JSON.parse(readFileSync(path.join(output, 'stdout.log'), 'utf8'));
        if (!isRecord(observation) || typeof observation.namespace !== 'string' || typeof observation.pid !== 'number')
          throw new Error('Native namespace observation is absent.');
        expect(Number.isSafeInteger(observation.pid)).toBe(true);
        expect(observation.pid).toBeGreaterThan(1);
        expect(observation).toEqual({
          id: String(index),
          pid: observation.pid,
          pid1: 'tini',
          namespace: expect.stringMatching(/^pid:\[\d+\]$/u),
          denied: 4,
          input: 'immutable input',
          scratch: String(index),
          temporary: String(index),
          cache: '0',
        });
        namespaces.push(observation.namespace);
        expect(readFileSync(path.join(output, 'stderr.log'), 'utf8')).toBe('worker-stderr:' + index + '\n');
        expect(readFileSync(path.join(output, 'done'), 'utf8')).toBe(String(index));
        for (const leaf of ['scratch/owned', 'tmp/owned'])
          expect(readFileSync(path.join(output, leaf), 'utf8')).toBe(String(index));
        expect(existsSync(path.join(output, 'tmp/bun-transpiler-cache'))).toBe(false);
        expect(existsSync(path.join(output, 'forbidden'))).toBe(false);
      }
      expect(new Set(namespaces).size).toBe(2);
      expect(namespaces).not.toContain(readlinkSync('/proc/self/ns/pid'));
      expect(readFileSync(current.sharedInput, 'utf8')).toBe('immutable input');
      expect(readFileSync(current.sharedDescriptor, 'utf8')).toBe('{"immutable":true}');
      expect(readFileSync(path.join(current.sandbox, 'subject.ts'), 'utf8')).toBe('export const value = 1;\n');
      complete = true;
    } finally {
      await Promise.allSettled(pending);
      if (complete) rmSync(current.repositoryRoot, { recursive: true });
      else console.error('NATIVE_MECHANICS_RETAINED', current.repositoryRoot);
    }
  },
);

test('report overlays reject aliased or missing mount destinations and linked descriptors before launch', () => {
  const current = fixture();
  const outputRoot = current.outputs[0]!;
  const target = path.join(outputRoot, path.relative(current.directory, current.sandbox));
  const descriptorTarget = path.join(outputRoot, path.basename(current.sharedDescriptor));
  const input = {
    bwrap: current.bwrap,
    tini: current.tini,
    executable: process.execPath,
    repositoryRoot: current.repositoryRoot,
    sandbox: current.sandbox,
    outputRoot,
    reportOverlay: { directory: current.directory, descriptorFile: current.sharedDescriptor },
  };
  let complete = false;
  try {
    expect(() => nativeMutationMechanicsWorkerCommand(input)).toThrow();
    mkdirSync(path.dirname(target), { recursive: true });
    symlinkSync(current.sandbox, target, 'dir');
    expect(() => nativeMutationMechanicsWorkerCommand(input)).toThrow('sandbox destination');
    unlinkSync(target);
    mkdirSync(target);
    expect(() => nativeMutationMechanicsWorkerCommand(input)).toThrow();
    symlinkSync(current.sharedDescriptor, descriptorTarget);
    expect(() => nativeMutationMechanicsWorkerCommand(input)).toThrow('single-link');
    unlinkSync(descriptorTarget);
    linkSync(current.sharedDescriptor, descriptorTarget);
    expect(() => nativeMutationMechanicsWorkerCommand(input)).toThrow('single-link');
    unlinkSync(descriptorTarget);
    writeFileSync(descriptorTarget, '');
    expect(nativeMutationMechanicsWorkerCommand(input)).toContain(current.sharedDescriptor);
    for (const reportOverlay of [
      { directory: current.repositoryRoot, descriptorFile: current.sharedDescriptor },
      { directory: current.sandbox, descriptorFile: current.sharedDescriptor },
      { directory: current.directory, descriptorFile: current.sharedInput },
      { directory: current.directory, descriptorFile: path.join(current.directory, 'descriptor.json') },
    ])
      expect(() => nativeMutationMechanicsWorkerCommand({ ...input, reportOverlay })).toThrow();
    complete = true;
  } finally {
    if (complete) rmSync(current.repositoryRoot, { recursive: true });
    else console.error('NATIVE_OVERLAY_RETAINED', current.repositoryRoot);
  }
});

test('a timed-out mechanics worker keeps its outcome while a held sibling drains independently', async () => {
  const current = fixture();
  const prepared = commands(current);
  const budget = executionBudget(4000, 300);
  const first = launch(current, prepared[0]!, 0, 'hang', budget, 300);
  let siblingSettled = false;
  const sibling = launch(current, prepared[1]!, 1, 'hold', budget).finally(() => {
    siblingSettled = true;
  });
  try {
    await waitForFile(path.join(current.outputs[1]!, 'ready.json'));
    const failed = await first;
    expect(failed.timedOut).toBe(true);
    expect(campaignProcessState(failed)).toBe('timeout');
    expect(failed.processCustody?.processGroupTerminationObserved).toBe(true);
    expect(failed.output_capture?.complete).toBe(true);
    expect(siblingSettled).toBe(false);
    writeFileSync(path.join(current.outputs[1]!, 'go'), 'release');
    const healthy = await sibling;
    expect(healthy.exitCode).toBe(0);
    expect(healthy.timedOut).toBe(false);
    expect(healthy.processCustody?.processGroupTerminationObserved).toBe(true);
    expect(healthy.output_capture?.complete).toBe(true);
  } finally {
    await Promise.allSettled([first, sibling]);
    console.error('NATIVE_MECHANICS_EXPECTED_TIMEOUT_RETAINED', current.repositoryRoot);
  }
});

test('a signaled mechanics worker preserves the nonzero native exit and closed custody', async () => {
  const current = fixture();
  const prepared = commands(current);
  const result = await launch(current, prepared[0]!, 0, 'signal', executionBudget(4000, 300));
  try {
    expect(result.exitCode).toBe(143);
    expect(campaignProcessState(result)).toBe('failed');
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBeNull();
    expect(result.processCustody?.terminationObserved).toBe(true);
    expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
    expect(result.output_capture?.complete).toBe(true);
  } finally {
    console.error('NATIVE_MECHANICS_EXPECTED_SIGNAL_RETAINED', current.repositoryRoot);
  }
});

test('a mechanics launch without an observed PID remains UNKNOWN', async () => {
  const current = fixture();
  const prepared = commands(current);
  prepared[0]![0] = path.join(current.repositoryRoot, 'missing-tini');
  try {
    const result = await launch(current, prepared[0]!, 0, 'hold', executionBudget(4000, 300));
    expect(result.exitCode).toBeNull();
    expect(result.spawnError).toBe('ENOENT');
    expect(result.processCustody).toBeNull();
    expect(campaignProcessState(result)).toBe('unknown');
  } finally {
    console.error('NATIVE_MECHANICS_EXPECTED_UNKNOWN_RETAINED', current.repositoryRoot);
  }
});

async function observedNamespaceInit(stdout: string): Promise<number> {
  const deadline = performance.now() + 1000;
  for (;;) {
    const text = readFileSync(stdout, 'utf8');
    const end = text.indexOf('}');
    if (end >= 0) {
      const info: unknown = JSON.parse(text.slice(0, end + 1));
      if (
        !isRecord(info) ||
        typeof info['child-pid'] !== 'number' ||
        !Number.isSafeInteger(info['child-pid']) ||
        info['child-pid'] <= 0
      )
        throw new Error('Native bubblewrap child identity is absent.');
      return info['child-pid'];
    }
    if (performance.now() >= deadline) throw new Error('Native bubblewrap child identity did not arrive.');
    await Bun.sleep(5);
  }
}

function nativeStartTime(pid: number, namespaceInit?: number): string | null {
  let stat: string;
  try {
    const prefix = namespaceInit === undefined ? '/proc' : '/proc/' + namespaceInit + '/root/proc';
    stat = readFileSync(prefix + '/' + pid + '/stat', 'utf8');
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return null;
    throw error;
  }
  const startTime = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  if (startTime === undefined || !/^\d+$/u.test(startTime))
    throw new Error('Native process start identity is invalid.');
  return startTime;
}

test('a worker namespace removes its observed detached descendant after the direct worker exits', async () => {
  const current = fixture('/dev/shm');
  const prepared = commands(current);
  prepared[0]!.splice(prepared[0]!.indexOf(current.bwrap) + 1, 0, '--info-fd', '1');
  const budget = executionBudget(4000, 300);
  const pending = prepared.map((command, index) =>
    launch(current, command, index, index === 0 ? 'descendant' : 'hold', budget),
  );
  let complete = false;
  try {
    await Promise.all(current.outputs.map((output) => waitForFile(path.join(output, 'ready.json'))));
    const init = await observedNamespaceInit(path.join(current.outputs[0]!, 'stdout.log'));
    expect(readFileSync('/proc/' + init + '/comm', 'utf8').trim()).toBe('tini');
    const armed: unknown = JSON.parse(readFileSync(path.join(current.outputs[0]!, 'descendant-ready'), 'utf8'));
    if (!isRecord(armed) || typeof armed.pid !== 'number' || !Number.isSafeInteger(armed.pid) || armed.pid <= 1)
      throw new Error('Armed descendant namespace PID is invalid.');
    const descendant = armed.pid;
    const initStart = nativeStartTime(init);
    const descendantStart = nativeStartTime(descendant, init);
    expect(initStart).not.toBeNull();
    expect(descendantStart).not.toBeNull();
    const descendantProc = '/proc/' + init + '/root/proc/' + descendant;
    expect(readFileSync(descendantProc + '/cmdline', 'utf8')).toContain('tooling/descendant.ts');
    const namespace = readlinkSync('/proc/' + init + '/ns/pid');
    expect(readlinkSync(descendantProc + '/ns/pid')).toBe(namespace);
    expect(namespace).not.toBe(readlinkSync('/proc/self/ns/pid'));
    for (const output of current.outputs) writeFileSync(path.join(output, 'go'), 'release');
    const outcomes = await Promise.all(pending);
    for (const result of outcomes) {
      expect(result.exitCode).toBe(0);
      expect(result.spawnError).toBeNull();
      expect(result.timedOut).toBe(false);
      expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
      expect(result.output_capture?.complete).toBe(true);
    }
    expect(nativeStartTime(init)).not.toBe(initStart);
    expect(nativeStartTime(descendant, init)).toBeNull();
    complete = true;
  } finally {
    await Promise.allSettled(pending);
    if (complete) rmSync(current.repositoryRoot, { recursive: true });
    else console.error('NATIVE_MECHANICS_RETAINED', current.repositoryRoot);
  }
});

test('native mechanics rejects input/output aliases before a worker can launch', () => {
  const current = fixture();
  const base = {
    bwrap: current.bwrap,
    tini: current.tini,
    executable: process.execPath,
    repositoryRoot: current.repositoryRoot,
    sandbox: current.sandbox,
    outputRoot: current.outputs[0]!,
  };
  let complete = false;
  try {
    const alias = path.join(current.repositoryRoot, 'output-alias');
    symlinkSync(current.outputs[0]!, alias, 'dir');
    for (const change of [
      { outputRoot: current.sandbox },
      { outputRoot: current.directory },
      { outputRoot: path.join(current.sandbox, '.tmp') },
      { outputRoot: alias },
      { outputRoot: path.join(current.directory, 'missing') },
      { repositoryRoot: current.outputs[1]! },
      { bwrap: 'bwrap' },
      { tini: 'tini' },
      { executable: 'bun' },
    ])
      expect(() => nativeMutationMechanicsWorkerCommand({ ...base, ...change })).toThrow();
    complete = true;
  } finally {
    if (complete) rmSync(current.repositoryRoot, { recursive: true });
    else console.error('NATIVE_MECHANICS_RETAINED', current.repositoryRoot);
  }
});

test('native mechanics rejects missing, linked and non-directory scratch mount targets before launch', () => {
  const current = fixture();
  let complete = false;
  try {
    const target = path.join(current.sandbox, '.tmp');
    renameSync(target, target + '-original');
    expect(() => commands(current)).toThrow();
    symlinkSync(path.join(current.sandbox, 'tooling'), target, 'dir');
    expect(() => commands(current)).toThrow('canonical existing directories');
    unlinkSync(target);
    writeFileSync(target, 'not a directory');
    expect(() => commands(current)).toThrow('canonical existing directories');
    complete = true;
  } finally {
    if (complete) rmSync(current.repositoryRoot, { recursive: true });
    else console.error('NATIVE_MECHANICS_RETAINED', current.repositoryRoot);
  }
});

test.each([tmpdir(), '/dev/shm'])(
  'report overlays under %s preserve logical paths while hiding sibling and host output',
  async (storage) => {
    const current = fixture(storage);
    const prepared = current.outputs.map((outputRoot) => {
      mkdirSync(path.join(outputRoot, path.relative(current.directory, current.sandbox)), { recursive: true });
      writeFileSync(path.join(outputRoot, path.basename(current.sharedDescriptor)), '');
      return nativeMutationMechanicsWorkerCommand({
        bwrap: current.bwrap,
        tini: current.tini,
        executable: process.execPath,
        repositoryRoot: current.repositoryRoot,
        sandbox: current.sandbox,
        outputRoot,
        reportOverlay: { directory: current.directory, descriptorFile: current.sharedDescriptor },
      });
    });
    const budget = executionBudget(4000, 300);
    const pending = prepared.map((command, index) => launch(current, command, index, 'overlay', budget));
    let complete = false;
    try {
      await Promise.all(current.outputs.map((output) => waitForFile(path.join(output, 'ready.json'))));
      expect(existsSync(path.join(current.directory, 'ready.json'))).toBe(false);
      expect(existsSync(path.join(current.directory, 'done'))).toBe(false);
      for (const [index, output] of current.outputs.entries()) {
        const observed: unknown = JSON.parse(readFileSync(path.join(output, 'ready.json'), 'utf8'));
        if (!isRecord(observed)) throw new Error('Overlay native observation is absent.');
        expect(observed.id).toBe(String(index));
        expect(observed.report).toBe(current.directory);
        expect(observed.cwd).toBe(current.sandbox);
        expect(observed.pid1).toBe('tini');
        expect(observed.denied).toBe(4);
        expect(observed.input).toBe('immutable input');
        expect(observed.scratch).toBe(String(index));
        expect(observed.temporary).toBe(String(index));
        expect(observed.cache).toBe('0');
        expect(existsSync(path.join(output, 'tmp/bun-transpiler-cache'))).toBe(false);
        writeFileSync(path.join(output, 'go'), 'release');
      }
      const outcomes = await Promise.all(pending);
      for (const [index, result] of outcomes.entries()) {
        expect(result.exitCode).toBe(0);
        expect(result.spawnError).toBeNull();
        expect(result.signal).toBeNull();
        expect(result.timedOut).toBe(false);
        expect(result.output_capture?.complete).toBe(true);
        expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
        const output = current.outputs[index]!;
        expect(readFileSync(path.join(output, 'done'), 'utf8')).toBe(String(index));
        expect(readFileSync(path.join(output, 'scratch/owned'), 'utf8')).toBe(String(index));
        expect(existsSync(path.join(output, 'forbidden'))).toBe(false);
        expect(readFileSync(path.join(output, 'fixture.inputs.json'), 'utf8')).toBe('');
      }
      expect(readFileSync(current.sharedDescriptor, 'utf8')).toBe('{"immutable":true}');
      expect(readFileSync(path.join(current.sandbox, 'subject.ts'), 'utf8')).toBe('export const value = 1;\n');
      expect(existsSync(path.join(current.directory, 'done'))).toBe(false);
      complete = true;
    } finally {
      await Promise.allSettled(pending);
      if (complete) rmSync(current.repositoryRoot, { recursive: true });
      else console.error('NATIVE_OVERLAY_RETAINED', current.repositoryRoot);
    }
  },
);
