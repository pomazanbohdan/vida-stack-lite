import { expect, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { captureCleanInitializationPlan } from '../bin/consumer-clean-initialization.ts';
import * as safeAccess from '../src/config/safe-repository-access.ts';
import * as relocation from '../bin/consumer-project-relocation.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';

const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const outputPaths = [
  'AGENTS.md',
  'AGENT.sidecar.md',
  'agent-runtime.config.v1.yaml',
  'docs/agent-instructions/documentation-policy.v1.json',
];
function fixture(large = false) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-plan-')));
  for (const directory of [
    '.agent/work/empty',
    'packages/agent',
    'packages/plugin',
    'packages/powers',
    'docs/agent-instructions',
  ])
    mkdirSync(path.join(root, directory), { recursive: true });
  for (const [index, file] of outputPaths.entries()) writeFileSync(path.join(root, file), `custom ${index}\n`);
  writeFileSync(
    path.join(root, '.agent/work/history.jsonl'),
    large ? Buffer.alloc(9 * 1024 * 1024, 0x41) : '{"old":true}\n',
  );
  if (large) writeFileSync(path.join(root, '.agent/work/custom notes.jsonl'), '{"custom":true}\n');
  writeFileSync(path.join(root, 'packages/plugin/custom.txt'), 'source bytes');
  const request = {
    projectRoot: root,
    repository: 'sample',
    projectMappings: ['agent=packages/agent', 'plugin=packages/codex', 'powers=packages/powers'],
  };
  const options = { operationId: 'operation-1', projectMoves: ['plugin=packages/plugin:packages/codex'] };
  return { root, request, options };
}

const nativeWindows = test.skipIf(process.platform !== 'win32');

nativeWindows('captures a read-only three-project plan with opaque custom data and a large history file', async () => {
  const { root, request, options } = fixture(true);
  const data = outputPaths.map((name) => readFileSync(path.join(root, name)));
  const history = readFileSync(path.join(root, '.agent/work/history.jsonl'));
  const agentEntries = readdirSync(path.join(root, '.agent')).sort();
  const packageEntries = readdirSync(path.join(root, 'packages')).sort();
  const plan = await captureCleanInitializationPlan(request, options);
  expect(Object.isFrozen(plan)).toBe(true);
  expect(plan.phase).toBe('intent');
  expect(plan.prepared).toBeNull();
  expect(plan.request.projectMappings).toEqual(request.projectMappings);
  expect(plan.moves).toHaveLength(6);
  expect(plan.moves.find((move) => move.kind === 'project')).toMatchObject({
    source: 'packages/plugin',
    target: 'packages/codex',
    type: 'directory',
    state: 'not-started',
  });
  for (const [index, name] of outputPaths.entries()) {
    expect(plan.inventory.find((item) => item.path === name)).toMatchObject({
      type: 'file',
      size: data[index]!.length,
      sha256: sha(data[index]!),
    });
    expect(readFileSync(path.join(root, name))).toEqual(data[index]!);
  }
  expect(plan.inventory.find((item) => item.path === '.agent/work/history.jsonl')).toMatchObject({
    type: 'file',
    size: history.length,
    sha256: sha(history),
  });
  expect(plan.inventory.find((item) => item.path === '.agent/work/custom notes.jsonl')).toMatchObject({ type: 'file' });
  expect(readFileSync(path.join(root, '.agent/work/custom notes.jsonl'), 'utf8')).toBe('{"custom":true}\n');
  expect(plan.inventory.find((item) => item.path === '.agent/work/empty')).toMatchObject({
    type: 'directory',
    children: [],
  });
  expect(plan.moves.every((move) => move.source_identity.length > 0 && move.state === 'not-started')).toBe(true);
  expect(plan.containers.every((container) => container.state === 'not-started' && container.identity === null)).toBe(
    true,
  );
  expect(readFileSync(path.join(root, '.agent/work/history.jsonl'))).toEqual(history);
  expect(readFileSync(path.join(root, 'packages/plugin/custom.txt'), 'utf8')).toBe('source bytes');
  expect(readdirSync(path.join(root, '.agent')).sort()).toEqual(agentEntries);
  expect(readdirSync(path.join(root, 'packages')).sort()).toEqual(packageEntries);
  expect(existsSync(path.join(root, '.vida'))).toBe(false);
  expect(existsSync(path.join(root, 'packages/codex'))).toBe(false);
  expect(existsSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH))).toBe(false);
});

nativeWindows('refuses occupied namespace, destination, and pending markers without modifying them', async () => {
  for (const occupied of [
    '.agent/clean-initialization-history/operation-1',
    'packages/codex',
    CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
    '.agent/runtime-initialization.pending.v1.json',
  ]) {
    const { root, request, options } = fixture();
    const absolute = path.join(root, occupied);
    if (occupied.endsWith('.json')) writeFileSync(absolute, 'foreign');
    else mkdirSync(absolute, { recursive: true });
    await Promise.resolve(
      expect(captureCleanInitializationPlan(request, options)).rejects.toThrow('occupied plan path'),
    );
    expect(existsSync(absolute)).toBe(true);
    if (occupied.endsWith('.json')) expect(readFileSync(absolute, 'utf8')).toBe('foreign');
    expect(existsSync(path.join(root, '.vida'))).toBe(false);
  }
});

nativeWindows('refuses hard-linked source bytes without creating any destination', async () => {
  const { root, request, options } = fixture();
  linkSync(path.join(root, 'packages/plugin/custom.txt'), path.join(root, 'packages/plugin/alias.txt'));
  await Promise.resolve(expect(captureCleanInitializationPlan(request, options)).rejects.toThrow());
  expect(existsSync(path.join(root, 'packages/codex'))).toBe(false);
  expect(existsSync(path.join(root, '.vida'))).toBe(false);
});

nativeWindows('refuses a missing verified metadata capability without consumer effects', async () => {
  const { root, request, options } = fixture();
  const original = safeAccess.requireSafeRepositoryAccess;
  let selected = 0;
  const spy = spyOn(safeAccess, 'requireSafeRepositoryAccess').mockImplementation((target) => {
    const access = original(target);
    if (path.resolve(target) !== root) return access;
    selected++;
    const withoutMetadata = { ...access };
    delete withoutMetadata.observeReadOnlyLargeFile;
    return withoutMetadata;
  });
  try {
    await Promise.resolve(
      expect(captureCleanInitializationPlan(request, options)).rejects.toThrow(
        'Windows verified file observation is unavailable',
      ),
    );
    expect(selected).toBeGreaterThan(0);
    expect(existsSync(path.join(root, '.vida'))).toBe(false);
    expect(existsSync(path.join(root, 'packages/codex'))).toBe(false);
  } finally {
    spy.mockRestore();
  }
});

nativeWindows('forwards remaining inventory allowances and reuses them on recapture', async () => {
  const { root, request, options } = fixture();
  const original = relocation.captureCleanSourceDirectoryInventory;
  const calls: { source: string; maxEntries: number; maxBytes: number }[] = [];
  const spy = spyOn(relocation, 'captureCleanSourceDirectoryInventory').mockImplementation(
    async (target, source, allowance) => {
      if (!allowance) throw new Error('Planner did not supply inventory allowance');
      calls.push({ source, ...allowance });
      return original(target, source, allowance);
    },
  );
  try {
    const plan = await captureCleanInitializationPlan(request, options);
    const fileBytes = outputPaths.reduce((sum, name) => sum + readFileSync(path.join(root, name)).length, 0);
    expect(calls).toHaveLength(4);
    expect(calls[0]).toEqual({ source: '.agent/work', maxEntries: 9996, maxBytes: 512 * 1024 * 1024 - fileBytes });
    const work = plan.inventory.filter(
      (entry) => entry.path === '.agent/work' || entry.path.startsWith('.agent/work/'),
    );
    const workBytes = work.reduce((sum, entry) => sum + (entry.type === 'file' ? entry.size : 0), 0);
    expect(calls[1]).toEqual({
      source: 'packages/plugin',
      maxEntries: 9996 - work.length,
      maxBytes: 512 * 1024 * 1024 - fileBytes - workBytes,
    });
    expect(calls.slice(2)).toEqual(calls.slice(0, 2));
  } finally {
    spy.mockRestore();
  }
});

nativeWindows('stops before the next tree when earlier roots exhaust the entry budget', async () => {
  const { request, options } = fixture();
  const original = relocation.captureCleanSourceDirectoryInventory;
  const calls: string[] = [];
  const spy = spyOn(relocation, 'captureCleanSourceDirectoryInventory').mockImplementation(
    async (target, source, allowance) => {
      if (!allowance) throw new Error('Planner did not supply inventory allowance');
      calls.push(source);
      const snapshot = await original(target, source, allowance);
      return { ...snapshot, entryCount: allowance.maxEntries };
    },
  );
  try {
    await Promise.resolve(
      expect(captureCleanInitializationPlan(request, options)).rejects.toThrow('aggregate inventory limit'),
    );
    expect(calls).toEqual(['.agent/work']);
  } finally {
    spy.mockRestore();
  }
});

nativeWindows('observes root names through the read-only repository view', () => {
  const { root } = fixture();
  const view = safeAccess.repositoryReadOnlyObservation(safeAccess.requireSafeRepositoryAccess(root));
  expect(view.listFiles('.', 'root listing')).toContain('AGENTS.md');
});
