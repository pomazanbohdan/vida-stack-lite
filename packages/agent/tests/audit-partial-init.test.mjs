import { afterEach, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, stringify } from 'yaml';
import { initializeProjectFromBundle } from '../bin/init-core.mjs';
import { main } from '../bin/init.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.resolve(bundle, '../../.tmp/audit-partial-init-fixtures');
const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function consumer() {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, 'consumer-'));
  roots.push(root);
  await mkdir(path.join(root, '.git'));
  return root;
}
const input = (root) => ({ projectRoot: root, repository: 'consumer', projectMappings: ['sample'] });
const pending = '.agent/runtime-initialization.pending.v1.json';
const receipt = '.agent/runtime-initialization.v1.json';
async function interrupt(root, target, selectedBundle = bundle) {
  const accessUrl = pathToFileURL(path.join(bundle, 'src/config/safe-repository-access.ts')).href;
  const coreUrl = pathToFileURL(path.join(bundle, 'bin/init-core.mjs')).href;
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
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', script], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
  expect(result.code, result.stderr).toBe(0);
}
async function snapshot(root) {
  const names = (await readdir(root, { recursive: true })).map((name) => name.split(path.sep).join('/')).sort(),
    bytes = {};
  for (const name of names)
    try {
      bytes[name] = (await readFile(path.join(root, name))).toString('base64');
    } catch (error) {
      if (error.code !== 'EISDIR' && error.code !== 'EPERM') throw error;
    }
  return bytes;
}

test('public partial initialization fails explicitly and preserves all existing bytes without publishing', async () => {
  const root = await consumer();
  try {
    const bytes = Buffer.from('project-owned instructions\r\n');
    await writeFile(path.join(root, 'AGENTS.md'), bytes);
    const before = await readdir(root, { recursive: true });
    const exit = { exitCode: 0 };
    const stdout = [];
    const stderr = [];
    await main({
      isMain: true,
      bunRuntime: true,
      args: ['--project-root', root, '--repository', 'consumer', '--project', 'sample'],
      exit,
      io: { log: (message) => stdout.push(message), error: (message) => stderr.push(message) },
      initialize: (input) => initializeProjectFromBundle(input, bundle),
    });
    expect(exit.exitCode).toBe(1);
    expect(stdout).toEqual([]);
    const result = JSON.parse(stderr[0]);
    expect(result).toMatchObject({ status: 'partial_not_ready', ready: false, existing: ['AGENTS.md'] });
    expect(result.missing).toContain('AGENT.sidecar.md');
    expect(result.next_action).toContain('reconciliation');
    expect(await readFile(path.join(root, 'AGENTS.md'))).toEqual(bytes);
    expect(await readdir(root, { recursive: true })).toEqual(before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
    const intent = await readFile(path.join(root, pending));
    const before = await snapshot(root);
    await expect(initializeProjectFromBundle(input(root), bundle)).rejects.toThrow(/partial_not_ready/);
    expect(await snapshot(root)).toEqual(before);
    const result = await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle);
    expect(result.status).toBe('resumed_initialization');
    const final = JSON.parse(await readFile(path.join(root, receipt), 'utf8'));
    expect(final.created_at).toBe(JSON.parse(intent).created_at);
    expect(final.provenance).toBe('generated');
    for (const [name, bytes] of Object.entries(before))
      if (name !== pending) expect((await readFile(path.join(root, name))).toString('base64')).toBe(bytes);
    const after = await snapshot(root);
    expect((await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle)).status).toBe(
      'existing',
    );
    expect(await snapshot(root)).toEqual(after);
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
  const config = parse(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
  config.agents.profiles.executor.reasoning = 'high';
  const configBytes = Buffer.from(stringify(config));
  await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), configBytes);
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  const policy = JSON.parse(await readFile(path.join(root, policyPath), 'utf8'));
  policy.owner = 'project-owner';
  const policyBytes = Buffer.from(JSON.stringify(policy, null, 2) + '\n');
  await writeFile(path.join(root, policyPath), policyBytes);
  await initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle);
  expect(await readFile(path.join(root, 'AGENT.sidecar.md'))).toEqual(sidecar);
  expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
  expect(await readFile(path.join(root, policyPath))).toEqual(policyBytes);
  expect(JSON.parse(await readFile(path.join(root, receipt), 'utf8')).provenance).toBe('adopted_existing');
}, 15_000);

test('pending recovery denies changed managed AGENTS, foreign repository/project/root and unknown old partials before publication', async () => {
  const root = await consumer();
  await interrupt(root, 'AGENT.sidecar.md');
  for (const request of [
    { ...input(root), repository: 'foreign' },
    { ...input(root), projectMappings: ['foreign'] },
  ]) {
    const before = await snapshot(root);
    await expect(initializeProjectFromBundle({ ...request, reconcileExisting: true }, bundle)).rejects.toThrow(
      /intent differs/,
    );
    expect(await snapshot(root)).toEqual(before);
  }
  const other = await consumer();
  await mkdir(path.join(other, '.agent'));
  await writeFile(path.join(other, pending), await readFile(path.join(root, pending)));
  const beforeOther = await snapshot(other);
  await expect(initializeProjectFromBundle({ ...input(other), reconcileExisting: true }, bundle)).rejects.toThrow(
    /intent differs/,
  );
  expect(await snapshot(other)).toEqual(beforeOther);
  await writeFile(path.join(root, 'AGENTS.md'), 'owner edited managed instructions');
  const before = await snapshot(root);
  await expect(initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, bundle)).rejects.toThrow(
    /diff resolution/,
  );
  expect(await snapshot(root)).toEqual(before);
  const unknown = await consumer();
  await writeFile(path.join(unknown, 'AGENTS.md'), 'unidentified old partial');
  const unknownBefore = await snapshot(unknown);
  await expect(initializeProjectFromBundle({ ...input(unknown), reconcileExisting: true }, bundle)).rejects.toThrow(
    /requires all existing/,
  );
  expect(await snapshot(unknown)).toEqual(unknownBefore);
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
  await expect(initializeProjectFromBundle({ ...input(root), reconcileExisting: true }, isolated)).rejects.toThrow(
    /intent differs/,
  );
  expect(await snapshot(root)).toEqual(before);
  const committed = await consumer();
  await interrupt(committed, 'archive');
  const changed = JSON.parse(await readFile(path.join(committed, receipt), 'utf8'));
  changed.workspace_id = 'a'.repeat(64);
  await writeFile(path.join(committed, receipt), JSON.stringify(changed));
  const conflict = await snapshot(committed);
  await expect(initializeProjectFromBundle({ ...input(committed), reconcileExisting: true }, bundle)).rejects.toThrow(
    /cannot replace/,
  );
  expect(await snapshot(committed)).toEqual(conflict);
}, 15_000);
