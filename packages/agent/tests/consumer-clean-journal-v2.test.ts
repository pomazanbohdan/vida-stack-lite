import { describe, expect, test } from 'bun:test';
import schema from '../schemas/consumer-clean-initialization-operation.v2.schema.json' with { type: 'json' };
import {
  decodeCleanInitializationOperationV2,
  sealCleanInitializationOperationV2,
  validateCleanInitializationOperationV2,
} from '../bin/consumer-clean-initialization-v2.ts';

const digest = 'a'.repeat(64);
const root = 'C:\\repo';
const archiveRoot = '.agent/clean-initialization-history/op-2/payload';
const policy = 'docs/agent-instructions/documentation-policy.v1.json';

type FileObservation = { type: string; path: string; identity: string; size: number; sha256: string };

function containerRecords(targets: readonly string[]) {
  const paths = new Set<string>();
  for (const target of targets) {
    const parts = target.split('/');
    for (let count = 1; count < parts.length; count += 1) {
      const parent = parts.slice(0, count).join('/');
      if (parent !== '.agent') paths.add(parent);
    }
  }
  return [...paths].sort().map((path) => ({ path, state: 'not-started', identity: null as string | null }));
}

function draft() {
  return {
    schema: 'ConsumerCleanInitializationOperation/v2',
    version: 2,
    operation_id: 'op-2',
    root,
    root_identity: 'root-id',
    workspace_id: digest,
    request: { projectRoot: root, repository: 'repo', projectMappings: ['agent=packages/agent'] },
    runtime: { version: '1.2.3', bundle_identity: 'bundle-id', resource_digest: digest },
    archive_root: archiveRoot,
    inventory: [{ type: 'file', path: 'AGENTS.md', identity: 'agents-id', size: 7, sha256: digest }],
    preserved: [] as FileObservation[],
    protected_paths: ['.agent/coordination', '.agent/work'],
    moves: [
      {
        kind: 'archive',
        source: 'AGENTS.md',
        target: `${archiveRoot}/AGENTS.md`,
        source_identity: 'agents-id',
        type: 'file',
        state: 'not-started',
      },
    ],
    containers: containerRecords([`${archiveRoot}/AGENTS.md`]),
    phase: 'intent',
    prepared: null,
    initialization: 'not-started',
  };
}

function populatedDraft() {
  const value = draft();
  value.inventory.push(
    { type: 'file', path: 'agent-runtime.config.v1.yaml', identity: 'cfg-id', size: 4, sha256: 'b'.repeat(64) },
    {
      type: 'file',
      path: '.agent/runtime-initialization.v1.json',
      identity: 'state-id',
      size: 20,
      sha256: 'd'.repeat(64),
    },
  );
  value.moves.push(
    {
      kind: 'archive',
      source: 'agent-runtime.config.v1.yaml',
      target: `${archiveRoot}/agent-runtime.config.v1.yaml`,
      source_identity: 'cfg-id',
      type: 'file',
      state: 'not-started',
    },
    {
      kind: 'archive',
      source: '.agent/runtime-initialization.v1.json',
      target: `${archiveRoot}/.agent/runtime-initialization.v1.json`,
      source_identity: 'state-id',
      type: 'file',
      state: 'not-started',
    },
  );
  value.inventory.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  value.moves.sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0));
  value.preserved = [
    { type: 'file', path: 'AGENT.sidecar.md', identity: 'sidecar-id', size: 9, sha256: 'e'.repeat(64) },
    { type: 'file', path: policy, identity: 'kept-policy-id', size: 11, sha256: 'f'.repeat(64) },
  ];
  value.protected_paths = ['.agent/coordination', '.agent/work', 'docs'];
  value.containers = containerRecords(value.moves.map((move) => move.target));
  return value;
}

describe('clean initialization v2 contract', () => {
  test('seals minimal and populated file-only plans as independent frozen snapshots', () => {
    const minimal = draft();
    const sealed = sealCleanInitializationOperationV2(minimal);
    minimal.inventory[0]!.identity = 'mutated';
    expect(sealed.inventory[0]!.identity).toBe('agents-id');
    expect(Object.isFrozen(sealed)).toBe(true);
    expect(Object.isFrozen(sealed.inventory[0])).toBe(true);
    expect(Object.isFrozen(sealed.protected_paths)).toBe(true);
    expect(sealCleanInitializationOperationV2(populatedDraft()).moves).toHaveLength(3);
  });

  test('accepts only allowlisted file archive sources and their exact owned targets', () => {
    const receiptSources = [
      'AGENTS.md',
      'agent-runtime.config.v1.yaml',
      policy,
      '.agent/runtime-initialization.v1.json',
    ];
    for (const source of receiptSources) {
      const value = draft();
      value.inventory[0]!.path = source;
      value.moves[0]!.source = source;
      value.moves[0]!.target = `${archiveRoot}/${source}`;
      value.containers = containerRecords(value.moves.map((move) => move.target));
      expect(sealCleanInitializationOperationV2(value).moves[0]!.source).toBe(source);
    }
    const maximum = draft();
    const sources = [...receiptSources].sort();
    maximum.inventory = sources.map((source, index) => ({
      type: 'file',
      path: source,
      identity: `file-${index}`,
      size: index,
      sha256: digest,
    }));
    maximum.moves = sources.map((source, index) => ({
      kind: 'archive',
      source,
      target: `${archiveRoot}/${source}`,
      source_identity: `file-${index}`,
      type: 'file',
      state: 'not-started',
    }));
    maximum.containers = containerRecords(maximum.moves.map((move) => move.target));
    expect(sealCleanInitializationOperationV2(maximum).containers.map((container) => container.path)).toEqual([
      '.agent/clean-initialization-history',
      '.agent/clean-initialization-history/op-2',
      '.agent/clean-initialization-history/op-2/payload',
      '.agent/clean-initialization-history/op-2/payload/.agent',
      '.agent/clean-initialization-history/op-2/payload/docs',
      '.agent/clean-initialization-history/op-2/payload/docs/agent-instructions',
    ]);
    const policyAndRuntime = structuredClone(maximum);
    policyAndRuntime.moves = policyAndRuntime.moves.filter((move) =>
      ['agent-runtime.config.v1.yaml', policy].includes(move.source),
    );
    policyAndRuntime.inventory = policyAndRuntime.inventory.filter((entry) =>
      policyAndRuntime.moves.some((move) => move.source === entry.path),
    );
    policyAndRuntime.containers = containerRecords(policyAndRuntime.moves.map((move) => move.target));
    expect(sealCleanInitializationOperationV2(policyAndRuntime).moves.map((move) => move.source)).toEqual([
      'agent-runtime.config.v1.yaml',
      policy,
    ]);
    const disallowed = draft();
    disallowed.inventory[0]!.path = '.agent/work/receipt.json';
    disallowed.moves[0]!.source = '.agent/work/receipt.json';
    disallowed.moves[0]!.target = `${archiveRoot}/.agent/work/receipt.json`;
    expect(() => sealCleanInitializationOperationV2(disallowed)).toThrow();
    const sidecar = draft();
    sidecar.inventory[0]!.path = 'AGENT.sidecar.md';
    sidecar.moves[0]!.source = 'AGENT.sidecar.md';
    sidecar.moves[0]!.target = `${archiveRoot}/AGENT.sidecar.md`;
    expect(() => sealCleanInitializationOperationV2(sidecar)).toThrow();
    const directory = {
      ...draft(),
      inventory: [{ type: 'directory', path: 'AGENTS.md', identity: 'agents-id', children: [] }],
      moves: [{ ...draft().moves[0]!, type: 'directory' }],
    };
    expect(() => sealCleanInitializationOperationV2(directory)).toThrow();
    const project = draft();
    project.moves[0]!.kind = 'project';
    expect(() => sealCleanInitializationOperationV2(project)).toThrow();
  });

  test('allows preserved sidecar and policy under protected docs but refuses moved policy there', () => {
    expect(sealCleanInitializationOperationV2(populatedDraft()).preserved).toHaveLength(2);
    const preservedAgents = draft();
    preservedAgents.preserved = [...preservedAgents.inventory];
    preservedAgents.inventory = [];
    preservedAgents.moves = [];
    preservedAgents.containers = [];
    expect(sealCleanInitializationOperationV2(preservedAgents).preserved[0]!.path).toBe('AGENTS.md');
    const movedProtected = draft();
    movedProtected.inventory[0]!.path = policy;
    movedProtected.moves[0]!.source = policy;
    movedProtected.moves[0]!.target = `${archiveRoot}/${policy}`;
    movedProtected.containers = containerRecords(movedProtected.moves.map((move) => move.target));
    movedProtected.protected_paths.push('docs');
    expect(() => sealCleanInitializationOperationV2(movedProtected)).toThrow();
    const overlap = populatedDraft();
    overlap.protected_paths = ['.agent/coordination', '.agent/work'];
    overlap.inventory.push({
      type: 'file',
      path: policy,
      identity: 'kept-policy-id',
      size: 11,
      sha256: 'f'.repeat(64),
    });
    overlap.moves.push({
      kind: 'archive',
      source: policy,
      target: `${archiveRoot}/${policy}`,
      source_identity: 'kept-policy-id',
      type: 'file',
      state: 'not-started',
    });
    overlap.inventory.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    overlap.moves.sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0));
    overlap.containers = containerRecords(overlap.moves.map((move) => move.target));
    expect(() => sealCleanInitializationOperationV2(overlap)).toThrow();
  });

  test('requires a normalized absolute root that matches the project request and parsed mappings', () => {
    const mismatched = draft();
    mismatched.request.projectRoot = 'C:\\other';
    expect(() => sealCleanInitializationOperationV2(mismatched)).toThrow();
    const relative = draft();
    relative.root = 'repo';
    relative.request.projectRoot = 'repo';
    expect(() => sealCleanInitializationOperationV2(relative)).toThrow();
    const invalidMapping = draft();
    invalidMapping.request.projectMappings = ['agent=../outside'];
    expect(() => sealCleanInitializationOperationV2(invalidMapping)).toThrow();
  });

  test('requires sorted unique protected paths, fixed work stores, safe paths, and no protected target overlap', () => {
    const missingWork = draft();
    missingWork.protected_paths = ['.agent/coordination'];
    expect(() => sealCleanInitializationOperationV2(missingWork)).toThrow();
    const unsorted = draft();
    unsorted.protected_paths = ['.agent/work', '.agent/coordination'];
    expect(() => sealCleanInitializationOperationV2(unsorted)).toThrow();
    const traversal = draft();
    traversal.protected_paths.push('../docs');
    traversal.protected_paths.sort();
    expect(() => sealCleanInitializationOperationV2(traversal)).toThrow();
    const mixedSeparators = draft();
    mixedSeparators.preserved = [{ type: 'file', path: 'docs\\notes.md', identity: 'x', size: 1, sha256: digest }];
    expect(() => sealCleanInitializationOperationV2(mixedSeparators)).toThrow();
    const universal = draft();
    universal.protected_paths = ['.', '.agent/coordination', '.agent/work'];
    expect(() => sealCleanInitializationOperationV2(universal)).toThrow();
    const empty = draft();
    empty.inventory = [];
    empty.moves = [];
    empty.containers = [];
    empty.protected_paths = ['.', '.agent/coordination', '.agent/work'];
    expect(sealCleanInitializationOperationV2(empty).protected_paths[0]).toBe('.');
    const protectedTarget = draft();
    protectedTarget.protected_paths.push('.agent/clean-initialization-history');
    protectedTarget.protected_paths.sort();
    expect(() => sealCleanInitializationOperationV2(protectedTarget)).toThrow();
    const caseCollision = draft();
    caseCollision.protected_paths = ['.agent/Coordination', '.agent/coordination', '.agent/work'];
    expect(() => sealCleanInitializationOperationV2(caseCollision)).toThrow();
  });

  test('binds preserved, protected, and inventory observations while excluding legal progress', () => {
    const record = sealCleanInitializationOperationV2(populatedDraft());
    for (const changed of [
      {
        ...record,
        preserved: record.preserved.map((entry, index) => (index === 0 ? { ...entry, sha256: digest } : entry)),
      },
      { ...record, protected_paths: [...record.protected_paths, 'wiki'].sort() },
      {
        ...record,
        inventory: record.inventory.map((entry, index) => (index === 0 ? { ...entry, size: entry.size + 1 } : entry)),
      },
    ]) {
      expect(() => validateCleanInitializationOperationV2(changed)).toThrow();
    }
    const progressed = {
      ...record,
      phase: 'archiving',
      moves: record.moves.map((move, index) => (index === 0 ? { ...move, state: 'issued' } : move)),
    };
    expect(validateCleanInitializationOperationV2(progressed).binding).toBe(record.binding);
  });

  test('enforces phase, archive, preparation, and completion consistency', () => {
    const earlyEffect = draft();
    earlyEffect.moves[0]!.state = 'issued';
    expect(() => sealCleanInitializationOperationV2(earlyEffect)).toThrow();
    const partialArchive = populatedDraft();
    partialArchive.phase = 'archive_complete';
    expect(() => sealCleanInitializationOperationV2(partialArchive)).toThrow();
    const inProgress = populatedDraft();
    inProgress.phase = 'archiving';
    inProgress.moves.forEach((move) => {
      move.state = 'completed';
    });
    inProgress.containers.forEach((container) => {
      container.state = 'completed';
      container.identity = 'dir-id';
    });
    expect(sealCleanInitializationOperationV2(inProgress).phase).toBe('archiving');
    const initializationWithoutPrepared = structuredClone(inProgress);
    initializationWithoutPrepared.phase = 'initializing';
    initializationWithoutPrepared.initialization = 'issued';
    expect(() => sealCleanInitializationOperationV2(initializationWithoutPrepared)).toThrow();
    const prepared = {
      intent: 'opaque',
      rootIdentity: 'root-id',
      bundleIdentity: 'bundle-id',
      projectIdentities: ['project-id'],
      resourceDigest: digest,
    };
    const complete = { ...inProgress, phase: 'complete', prepared, initialization: 'completed' };
    expect(sealCleanInitializationOperationV2(complete).phase).toBe('complete');
    expect(() => sealCleanInitializationOperationV2({ ...complete, initialization: 'issued' })).toThrow();
  });

  test('keeps schema and semantic validation aligned for strict closed records', async () => {
    const { Ajv2020 } = await import('ajv/dist/2020.js');
    const shape = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
    const valid = sealCleanInitializationOperationV2(draft());
    expect(shape(valid)).toBe(true);
    expect(schema.properties.schema.const).toBe(valid.schema);
    expect(schema.properties.version.const).toBe(valid.version);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.inventory.maxItems).toBe(4);
    expect(schema.properties.preserved.maxItems).toBe(3);
    expect(schema.properties.protected_paths.maxItems).toBe(256);
    expect(schema.properties.containers.maxItems).toBe(6);
    expect(shape({ ...valid, unexpected: true })).toBe(false);
    expect(() => sealCleanInitializationOperationV2({ ...draft(), unexpected: true })).toThrow();
    expect(() => sealCleanInitializationOperationV2({ ...draft(), version: 1 })).toThrow();
  });

  test('rejects malformed, oversized, and v1 bytes without changing the v1 reader', async () => {
    const oversizedFile = draft();
    oversizedFile.inventory[0]!.size = 67108865;
    expect(() => sealCleanInitializationOperationV2(oversizedFile)).toThrow();
    const { decodeCleanInitializationOperation, sealCleanInitializationOperation } =
      await import('../bin/consumer-clean-initialization.ts');
    const v1 = sealCleanInitializationOperation({
      schema: 'ConsumerCleanInitializationOperation/v1',
      version: 1,
      operation_id: 'op-1',
      root,
      root_identity: 'root-id',
      workspace_id: digest,
      request: { projectRoot: root, repository: 'repo', projectMappings: ['agent=packages/agent'] },
      runtime: { version: '1.2.3', bundle_identity: 'bundle-id', resource_digest: digest },
      archive_root: '.agent/clean-initialization-history/op-1/payload',
      inventory: [{ type: 'file', path: 'AGENTS.md', identity: 'file-id', size: 7, sha256: digest }],
      moves: [
        {
          kind: 'archive',
          source: 'AGENTS.md',
          target: '.agent/clean-initialization-history/op-1/payload/AGENTS.md',
          source_identity: 'file-id',
          type: 'file',
          state: 'not-started',
        },
      ],
      containers: [{ path: '.agent/clean-initialization-history/op-1/payload', state: 'not-started', identity: null }],
      phase: 'intent',
      prepared: null,
      initialization: 'not-started',
    });
    expect(decodeCleanInitializationOperation(Buffer.from(JSON.stringify(v1)))).toEqual(v1);
    expect(() => validateCleanInitializationOperationV2(v1)).toThrow();
    expect(() => decodeCleanInitializationOperationV2(Buffer.from(JSON.stringify(v1)))).toThrow();
    expect(() => decodeCleanInitializationOperationV2(Uint8Array.of(0xc3, 0x28))).toThrow();
    expect(() => decodeCleanInitializationOperationV2(new Uint8Array(8 * 1024 * 1024 + 1))).toThrow();
    expect(() =>
      decodeCleanInitializationOperationV2(
        Buffer.from('{"schema":"ConsumerCleanInitializationOperation/v2","version":2}'),
      ),
    ).toThrow();
  });
});
