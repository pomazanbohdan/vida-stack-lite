import { describe, expect, test } from 'bun:test';
import {
  decodeCleanInitializationOperation,
  sealCleanInitializationOperation,
  validateCleanInitializationOperation,
} from '../bin/consumer-clean-initialization.ts';

const digest = 'a'.repeat(64);
const root = 'C:\\repo';
const archive = '.agent/clean-initialization-history/op-1/payload';
function draft() {
  return {
    schema: 'ConsumerCleanInitializationOperation/v1',
    version: 1,
    operation_id: 'op-1',
    root,
    root_identity: 'root-id',
    workspace_id: digest,
    request: { projectRoot: root, repository: 'repo', projectMappings: ['agent=packages/agent'] },
    runtime: { version: '1.2.3', bundle_identity: 'bundle-id', resource_digest: digest },
    archive_root: archive,
    inventory: [{ type: 'file', path: 'AGENTS.md', identity: 'file-id', size: 7, sha256: digest }],
    moves: [
      {
        kind: 'archive',
        source: 'AGENTS.md',
        target: `${archive}/AGENTS.md`,
        source_identity: 'file-id',
        type: 'file',
        state: 'not-started',
      },
    ],
    containers: [{ path: archive, state: 'not-started', identity: null }],
    phase: 'intent',
    prepared: null,
    initialization: 'not-started',
  };
}
function workDraft(count: number, size = 0) {
  const value = draft();
  const names = Array.from({ length: count - 1 }, (_, index) => `file-${String(index).padStart(5, '0')}`);
  const work = {
    ...value,
    inventory: [
      { type: 'directory', path: '.agent/work', identity: 'work-id', children: names },
      ...names.map((name) => ({
        type: 'file',
        path: `.agent/work/${name}`,
        identity: `id-${name}`,
        size,
        sha256: digest,
      })),
    ],
    moves: [
      {
        kind: 'archive',
        source: '.agent/work',
        target: `${archive}/.agent/work`,
        source_identity: 'work-id',
        type: 'directory',
        state: 'not-started',
      },
    ],
  };
  return work;
}

describe('clean initialization journal data', () => {
  test('seals a sparse intent and freezes an independent snapshot', () => {
    const input = draft();
    const record = sealCleanInitializationOperation(input);
    input.inventory[0]!.identity = 'changed';
    expect(record.inventory[0]!.identity).toBe('file-id');
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.inventory[0])).toBe(true);
    expect(validateCleanInitializationOperation(record)).toEqual(record);
    expect(decodeCleanInitializationOperation(Buffer.from(JSON.stringify(record)))).toEqual(record);
  });
  test('binding is independent of object key order and excludes progress', () => {
    const value = draft();
    const first = sealCleanInitializationOperation(value);
    const reordered = Object.fromEntries(Object.entries(value).reverse());
    expect(sealCleanInitializationOperation(reordered).binding).toBe(first.binding);
    const progressed = structuredClone(first);
    const mutable = progressed as unknown as {
      phase: string;
      moves: { state: string }[];
      containers: { state: string; identity: string | null }[];
    };
    mutable.phase = 'archiving';
    mutable.moves[0]!.state = 'issued';
    mutable.containers[0]!.state = 'completed';
    mutable.containers[0]!.identity = 'container-id';
    expect(validateCleanInitializationOperation(progressed).binding).toBe(first.binding);
  });
  test('rejects accessors without invoking them, unknown keys and binding tampering', () => {
    let invoked = false;
    const value = draft();
    Object.defineProperty(value, 'root', {
      enumerable: true,
      get() {
        invoked = true;
        return root;
      },
    });
    expect(() => sealCleanInitializationOperation(value)).toThrow();
    expect(invoked).toBe(false);
    expect(() => sealCleanInitializationOperation({ ...draft(), extra: true })).toThrow();
    expect(() =>
      validateCleanInitializationOperation({ ...sealCleanInitializationOperation(draft()), binding: 'b'.repeat(64) }),
    ).toThrow();
  });
  test('rejects malformed UTF-8 and oversized pending bytes', () => {
    expect(() => decodeCleanInitializationOperation(Uint8Array.of(0xc3, 0x28))).toThrow();
    expect(() => decodeCleanInitializationOperation(new Uint8Array(8 * 1024 * 1024 + 1))).toThrow();
  });
  test('rejects duplicate, case-colliding, escaping and disconnected paths', () => {
    const duplicate = workDraft(2);
    duplicate.inventory.push({ ...duplicate.inventory[1]! });
    expect(() => sealCleanInitializationOperation(duplicate)).toThrow();
    const collision = workDraft(3);
    collision.inventory[2]!.path = '.agent/work/FILE-00000';
    expect(() => sealCleanInitializationOperation(collision)).toThrow();
    const escape = draft();
    escape.inventory[0]!.path = '../AGENTS.md';
    expect(() => sealCleanInitializationOperation(escape)).toThrow();
    const missing = workDraft(2);
    (missing.inventory[0] as { children: string[] }).children = [];
    expect(() => sealCleanInitializationOperation(missing)).toThrow();
    const wrongRoot = draft();
    wrongRoot.moves[0]!.source_identity = 'other';
    expect(() => sealCleanInitializationOperation(wrongRoot)).toThrow();
  });
  test('enforces archive and phase/prepared consistency', () => {
    const value = draft();
    value.moves[0]!.target = 'elsewhere';
    expect(() => sealCleanInitializationOperation(value)).toThrow();
    expect(() => sealCleanInitializationOperation({ ...draft(), phase: 'archive_complete' })).toThrow();
    expect(() =>
      sealCleanInitializationOperation({ ...draft(), phase: 'initializing', initialization: 'issued' }),
    ).toThrow();
    expect(() => sealCleanInitializationOperation({ ...draft(), phase: 'complete' })).toThrow();
    const prepared = {
      intent: 'opaque',
      rootIdentity: 'root-id',
      bundleIdentity: 'bundle-id',
      projectIdentities: ['project-id'],
      resourceDigest: digest,
    };
    const complete = {
      ...draft(),
      phase: 'complete',
      prepared,
      initialization: 'completed',
      moves: draft().moves.map((move) => ({ ...move, state: 'completed' })),
      containers: draft().containers.map((container) => ({
        ...container,
        state: 'completed',
        identity: 'container-id',
      })),
    };
    expect(sealCleanInitializationOperation(complete).prepared?.intent).toBe('opaque');
    expect(() =>
      sealCleanInitializationOperation({ ...complete, prepared: { ...prepared, rootIdentity: 'other' } }),
    ).toThrow();
  });
  test('permits 10000 inventory entries and rejects 10001', () => {
    expect(sealCleanInitializationOperation(workDraft(10000)).inventory).toHaveLength(10000);
    expect(() => sealCleanInitializationOperation(workDraft(10001))).toThrow();
  });
  test('allows read-only preparation before persisting the DTO and denies premature issuance', () => {
    const input = draft();
    const prefix = {
      ...input,
      phase: 'initializing',
      moves: input.moves.map((move) => ({ ...move, state: 'completed' })),
      containers: input.containers.map((container) => ({ ...container, state: 'completed', identity: 'container-id' })),
    };
    expect(sealCleanInitializationOperation(prefix).prepared).toBeNull();
    expect(() => sealCleanInitializationOperation({ ...prefix, initialization: 'issued' })).toThrow(
      'missing prepared initialization',
    );
    expect(() => sealCleanInitializationOperation({ ...prefix, initialization: 'completed' })).toThrow(
      'missing prepared initialization',
    );
  });
  test('enforces per-file and aggregate byte limits', () => {
    expect(() => sealCleanInitializationOperation(workDraft(2, 64 * 1024 * 1024 + 1))).toThrow();
    expect(() => sealCleanInitializationOperation(workDraft(10, 64 * 1024 * 1024))).toThrow();
    expect(sealCleanInitializationOperation(workDraft(9, 64 * 1024 * 1024)).inventory).toHaveLength(9);
  });
});
