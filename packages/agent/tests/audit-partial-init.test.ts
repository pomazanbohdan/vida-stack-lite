import { afterEach, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stringify } from 'yaml';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { main } from '../bin/init.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import type { RuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { runBoundedSubprocess, subprocessFailure, type BoundedSubprocessResult } from './helpers/bounded-subprocess.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';

type InitializationRequest = {
  readonly projectRoot: string;
  readonly repository: string;
  readonly projectMappings: readonly string[];
  readonly reconcileExisting?: boolean;
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.resolve(bundle, '../../.tmp/audit-partial-init-fixtures');
const roots: string[] = [];
const cleanupRoots = new Set<string>();
const children = new Set<Promise<BoundedSubprocessResult>>();

afterEach(async () => {
  await Promise.allSettled([...children]);
  children.clear();
  for (const root of roots.splice(0)) {
    if (cleanupRoots.delete(root)) await rm(root, { recursive: true, force: true });
  }
});
function allowFixtureCleanup(...fixtureRoots: readonly string[]): void {
  for (const root of fixtureRoots) cleanupRoots.add(root);
}
async function consumer(): Promise<string> {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, 'consumer-'));
  roots.push(root);
  await mkdir(path.join(root, '.git'));
  return root;
}
const input = (root: string): InitializationRequest => ({
  projectRoot: root,
  repository: 'consumer',
  projectMappings: ['sample'],
});
const pending = '.agent/runtime-initialization.pending.v1.json';
const receipt = '.agent/runtime-initialization.v1.json';
async function interrupt(root: string, target: string, selectedBundle = bundle): Promise<void> {
  const accessUrl = pathToFileURL(path.join(bundle, 'src/config/safe-repository-access.ts')).href;
  const coreUrl = pathToFileURL(path.join(bundle, 'bin/init-core.ts')).href;
  const script = `
    import {mock} from 'bun:test';
    const actual=await import(${JSON.stringify(accessUrl)}), real=actual.requireSafeRepositoryAccess;
    mock.module(${JSON.stringify(accessUrl)},()=>({...actual,requireSafeRepositoryAccess(root){
      const access=real(root);if(root!==${JSON.stringify(root)})return access;
      return {...access,moveNoReplaceAsync:async(...args)=>{if(${JSON.stringify(target)}==='archive')throw Error('fixture interruption');return access.moveNoReplaceAsync(...args);},prepareExclusiveCreation:async()=>{
        const creator=await access.prepareExclusiveCreation();return {...creator,writeExclusive:async(...args)=>{if(args[0]===${JSON.stringify(target)})throw Error('fixture interruption');return creator.writeExclusive(...args);}};
      }};
    }}));
    const {initializeProjectFromBundle}=await import(${JSON.stringify(coreUrl)});
    try{await initializeProjectFromBundle(${JSON.stringify(input(root))},${JSON.stringify(selectedBundle)});throw Error('expected interruption');}catch(error){if(error.message!=='fixture interruption')throw error;}
  `;
  const child = runBoundedSubprocess(process.execPath, ['-e', script], { timeoutMs: 15_000 });
  children.add(child);
  try {
    const result = await child;
    expect(
      result.exitCode === 0 && result.signal === null && !result.timedOut,
      subprocessFailure('interruption child', result),
    ).toBe(true);
  } finally {
    children.delete(child);
  }
}
async function readReceiptFile(root: string, name: string): Promise<RuntimeInitializationReceipt> {
  const value: unknown = JSON.parse(await readFile(path.join(root, name), 'utf8'));
  const schema = await readFile(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
  return validateRuntimeInitializationReceipt(value, schema);
}
function isExpectedDirectoryReadError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error.code === 'EISDIR' || error.code === 'EPERM');
}
async function snapshot(root: string): Promise<Record<string, string>> {
  const names = (await readdir(root, { recursive: true })).map((name) => name.split(path.sep).join('/')).sort(),
    bytes: Record<string, string> = {};
  for (const name of names)
    try {
      bytes[name] = (await readFile(path.join(root, name))).toString('base64');
    } catch (error) {
      if (!isExpectedDirectoryReadError(error)) throw error;
    }
  return bytes;
}

test('public partial initialization fails explicitly and preserves all existing bytes without publishing', async () => {
  const root = await consumer();
  const bytes = Buffer.from('project-owned instructions\r\n');
  await writeFile(path.join(root, 'AGENTS.md'), bytes);
  const before = await readdir(root, { recursive: true });
  const exit = { exitCode: 0 };
  const stdout: string[] = [];
  const stderr: unknown[] = [];
  await main({
    isMain: true,
    bunRuntime: true,
    args: ['--project-root', root, '--repository', 'consumer', '--project', 'sample'],
    exit,
    io: {
      log: (message: string) => stdout.push(message),
      error: (message: unknown) => stderr.push(message),
    },
    initialize: (input: InitializationRequest) => initializeProjectFromBundle(input, bundle),
  });
  expect(exit.exitCode).toBe(1);
  expect(stdout).toEqual([]);
  const message = stderr[0];
  if (typeof message !== 'string') throw new Error('Initialization failure did not emit a JSON message');
  const parsed: unknown = JSON.parse(message);
  if (!isRecord(parsed)) throw new Error('Initialization failure did not emit a JSON object');
  const result = parsed;
  expect(result).toMatchObject({ status: 'partial_not_ready', ready: false, existing: ['AGENTS.md'] });
  expect(result.missing).toContain('AGENT.sidecar.md');
  expect(result.next_action).toContain('reconciliation');
  expect(await readFile(path.join(root, 'AGENTS.md'))).toEqual(bytes);
  expect(await readdir(root, { recursive: true })).toEqual(before);
  allowFixtureCleanup(root);
});

for (const target of [
  'AGENTS.md',
  'AGENT.sidecar.md',
  'agent-runtime.config.v1.yaml',
  'docs/agent-instructions/documentation-policy.v1.json',
  receipt,
  'archive',
]) {
  test(`explicit reconciliation resumes interrupted ${target} using the same intent`, async () => {
    const root = await consumer();
    await interrupt(root, target);
    const intent = await readReceiptFile(root, pending);
    const before = await snapshot(root);
    await Promise.resolve(
      expect(initializeProjectFromBundle(input(root), bundle)).rejects.toThrow(/partial_not_ready/),
    );
    expect(await snapshot(root)).toEqual(before);
    const result = await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle);
    expect(result.status).toBe('resumed_initialization');
    const final = await readReceiptFile(root, receipt);
    expect(final.created_at).toBe(intent.created_at);
    expect(final.provenance).toBe('generated');
    expect(final.templates).toEqual(fixtureInitializationTemplates(root, bundle));
    for (const [name, bytes] of Object.entries(before))
      if (name !== pending) expect((await readFile(path.join(root, name))).toString('base64')).toBe(bytes);
    const after = await snapshot(root);
    expect((await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle)).status).toBe(
      'existing',
    );
    expect(await snapshot(root)).toEqual(after);
    allowFixtureCleanup(root);
  }, 15_000);
}

test('pending recovery preserves project-owned sidecar, policy and YAML settings while binding actual output evidence', async () => {
  const root = await consumer();
  await interrupt(root, receipt);
  const sidecar = Buffer.concat([
    await readFile(path.join(root, 'AGENT.sidecar.md')),
    Buffer.from('\nProject-owned business requirements.\r\n'),
  ]);
  await writeFile(path.join(root, 'AGENT.sidecar.md'), sidecar);
  const config = loadRuntimeConfig(root);
  const executor = config.agents.profiles.executor;
  if (!executor) throw new Error('Initialization fixture lacks its executor profile');
  const ownerConfig = {
    ...config,
    agents: {
      ...config.agents,
      profiles: {
        ...config.agents.profiles,
        executor: { ...executor, reasoning: 'high' },
      },
    },
  };
  const configBytes = Buffer.from(stringify(ownerConfig));
  await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), configBytes);
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  const policyValue: unknown = JSON.parse(await readFile(path.join(root, policyPath), 'utf8'));
  if (!isRecord(policyValue)) throw new Error('Initialization fixture policy is not an object');
  const policy = { ...policyValue, owner: 'project-owner' };
  const policyBytes = Buffer.from(JSON.stringify(policy, null, 2) + '\n');
  await writeFile(path.join(root, policyPath), policyBytes);
  await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle);
  expect(await readFile(path.join(root, 'AGENT.sidecar.md'))).toEqual(sidecar);
  expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
  expect(await readFile(path.join(root, policyPath))).toEqual(policyBytes);
  const final = await readReceiptFile(root, receipt);
  expect(final.provenance).toBe('adopted_existing');
  expect(final.templates).toEqual(fixtureInitializationTemplates(root, bundle));
  allowFixtureCleanup(root);
}, 15_000);

test('pending recovery denies changed managed AGENTS, foreign repository/project/root and unknown old partials before publication', async () => {
  const root = await consumer();
  await interrupt(root, 'AGENT.sidecar.md');
  for (const request of [
    { ...input(root), repository: 'foreign' },
    { ...input(root), projectMappings: ['foreign'] },
  ]) {
    const before = await snapshot(root);
    await Promise.resolve(
      expect(initializeProjectFromBundle({ ...request, reconcileExisting: true }, bundle)).rejects.toThrow(
        /intent differs/,
      ),
    );
    expect(await snapshot(root)).toEqual(before);
  }
  const other = await consumer();
  await mkdir(path.join(other, '.agent'));
  await writeFile(path.join(other, pending), await readFile(path.join(root, pending)));
  const beforeOther = await snapshot(other);
  await Promise.resolve(
    expect(initializeProjectFromBundle({ ...input(other), reconcileExisting: true }, bundle)).rejects.toThrow(
      /intent differs/,
    ),
  );
  expect(await snapshot(other)).toEqual(beforeOther);
  await writeFile(path.join(root, 'AGENTS.md'), 'owner edited managed instructions');
  const before = await snapshot(root);
  await Promise.resolve(
    expect(initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle)).rejects.toThrow(
      /diff resolution/,
    ),
  );
  expect(await snapshot(root)).toEqual(before);
  const unknown = await consumer();
  await writeFile(path.join(unknown, 'AGENTS.md'), 'unidentified old partial');
  const unknownBefore = await snapshot(unknown);
  await Promise.resolve(
    expect(initializeProjectFromBundle({ ...input(unknown), reconcileExisting: true }, bundle)).rejects.toThrow(
      /requires all existing/,
    ),
  );
  expect(await snapshot(unknown)).toEqual(unknownBefore);
  allowFixtureCleanup(root, other, unknown);
}, 15_000);

test('pending intent refuses changed templates and conflicting canonical receipt while retaining all bytes', async () => {
  const root = await consumer();
  const isolated = await consumer();
  for (const entry of ['templates', 'schemas', 'instructions', 'package.json', 'TESTING.md'])
    await cp(path.join(bundle, entry), path.join(isolated, entry), { recursive: true });
  await interrupt(root, 'AGENT.sidecar.md', isolated);
  await writeFile(
    path.join(isolated, 'templates/AGENT.sidecar.template.md'),
    'Changed {{REPOSITORY}} {{PROJECTS}} {{BUNDLE}}\n',
  );
  const before = await snapshot(root);
  await Promise.resolve(
    expect(initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, isolated)).rejects.toThrow(
      /intent differs/,
    ),
  );
  expect(await snapshot(root)).toEqual(before);
  const committed = await consumer();
  await interrupt(committed, 'archive');
  const changed = { ...(await readReceiptFile(committed, receipt)) };
  changed.workspace_id = 'a'.repeat(64);
  await writeFile(path.join(committed, receipt), JSON.stringify(changed));
  const conflict = await snapshot(committed);
  await Promise.resolve(
    expect(initializeProjectFromBundle({ ...input(committed), reconcileExisting: true }, bundle)).rejects.toThrow(
      /cannot replace/,
    ),
  );
  expect(await snapshot(committed)).toEqual(conflict);
  allowFixtureCleanup(root, isolated, committed);
}, 15_000);
