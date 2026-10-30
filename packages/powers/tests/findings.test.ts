import { afterAll, describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectories: string[] = [];
const originalFsPromises = { ...fsPromises };
const originalAppendFile = fsPromises.appendFile;
const originalOpen = fsPromises.open;

async function restoreFsPromisesModule(): Promise<void> {
  mock.restore();
  await mock.module('node:fs/promises', () => ({ ...originalFsPromises }));
}

async function withFaultCleanup(body: () => Promise<void>, cleanup: () => Promise<void>): Promise<void> {
  let outcome: { kind: 'complete' } | { kind: 'failed'; cause: unknown } = { kind: 'complete' };
  try { await body(); } catch (cause) { outcome = { kind: 'failed', cause }; }
  try { await cleanup(); } catch (cleanupError) {
    if (outcome.kind === 'failed') throw new AggregateError([outcome.cause, cleanupError], 'Finding test body and cleanup both failed');
    throw cleanupError;
  }
  if (outcome.kind === 'failed') throw outcome.cause;
}

test('fault cleanup preserves primary failures including undefined and aggregates a second failure', async () => {
  type Attempt = { kind: 'complete' } | { kind: 'failed'; cause: unknown };
  const primary = new Error('primary test failure');
  const secondary = new Error('cleanup failure');
  const cases: { body: Attempt; cleanup: Attempt }[] = [
    { body: { kind: 'complete' }, cleanup: { kind: 'complete' } },
    { body: { kind: 'failed', cause: undefined }, cleanup: { kind: 'complete' } },
    { body: { kind: 'failed', cause: primary }, cleanup: { kind: 'complete' } },
    { body: { kind: 'complete' }, cleanup: { kind: 'failed', cause: secondary } },
    { body: { kind: 'failed', cause: primary }, cleanup: { kind: 'failed', cause: secondary } },
  ];
  for (const scenario of cases) {
    const calls = [0, 0];
    let observed: { cause: unknown } | undefined;
    try {
      await withFaultCleanup(async () => {
        calls[0] = 1;
        if (scenario.body.kind === 'failed') throw scenario.body.cause;
      }, async () => {
        calls[1] = 1;
        if (scenario.cleanup.kind === 'failed') throw scenario.cleanup.cause;
      });
    } catch (cause) { observed = { cause }; }
    expect(calls).toEqual([1, 1]);
    if (scenario.body.kind === 'complete' && scenario.cleanup.kind === 'complete') {
      expect(observed).toBeUndefined();
    } else {
      expect(observed).toBeDefined();
      if (scenario.body.kind === 'failed' && scenario.cleanup.kind === 'failed') {
        expect(observed?.cause).toBeInstanceOf(AggregateError);
        expect(observed?.cause).toMatchObject({ errors: [scenario.body.cause, scenario.cleanup.cause] });
      } else {
        expect(observed?.cause).toBe(scenario.body.kind === 'failed' ? scenario.body.cause : secondary);
      }
    }
  }
});

async function newStore(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-findings-'));
  temporaryDirectories.push(directory);
  return join(directory, 'findings.jsonl');
}

type AppendResult = {
  operation: 'append';
  outcome: 'appended' | 'replayed';
  event_id: string;
  candidate_fingerprint: string | null;
};
type CandidateReason = 'event_id' | 'finding_id' | 'candidate_fingerprint' | 'context' | 'provenance';
type CandidateRow = {
  event_id: string;
  candidate_fingerprint: string;
  event: Record<string, unknown>;
  reasons: CandidateReason[];
};
type CandidateResult = {
  event_id: string;
  finding_id: string;
  candidate_fingerprint: string;
  candidates: CandidateRow[];
};
type FindingsApi = {
  appendFindingEvent: (storePath: string, event: unknown) => Promise<AppendResult>;
  findFindingCandidates: (storePath: string, event: unknown) => Promise<CandidateResult>;
};
type NativeFault =
  | { kind: 'read'; path: string }
  | { kind: 'open-create'; path: string }
  | { kind: 'handle-stat'; path: string }
  | { kind: 'handle-stat-close'; path: string }
  | { kind: 'rollback-stat'; path: string }
  | { kind: 'rollback-close'; path: string }
  | { kind: 'rollback-unlink'; path: string };
type NativeFaultCounts = {
  readFileErrors: number;
  openErrors: number;
  statErrors: number;
  writes: number;
  closeCalls: number;
  closeErrors: number;
  unlinkErrors: number;
};
type NativeFaultControl = {
  counts: () => NativeFaultCounts;
  restore: () => Promise<void>;
};

type PartialWriteFailureControl = {
  injectedWrites: () => number;
  restore: () => Promise<void>;
};

async function loadFindingsApi(): Promise<FindingsApi> {
  const module = await import('../skills/vp-mode/scripts/findings.ts').catch(() => null);
  expect(module).not.toBeNull();
  if (module === null) throw new Error('findings module is unavailable');
  return module as FindingsApi;
}

async function loadFreshFindingsApi(label: string): Promise<FindingsApi> {
  const moduleUrl = new URL('../skills/vp-mode/scripts/findings.ts', import.meta.url);
  moduleUrl.searchParams.set('native-fault-test', `${label}-${Date.now()}-${Math.random()}`);
  const module: unknown = await import(moduleUrl.href);
  if (!isFindingsApi(module)) throw new Error('fresh findings module has an invalid API');
  return module;
}

async function loadAppendFindingEvent(): Promise<FindingsApi['appendFindingEvent']> {
  return (await loadFindingsApi()).appendFindingEvent;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected a JSON object');
  }
  return value as Record<string, unknown>;
}

function isFindingsApi(value: unknown): value is FindingsApi {
  if (value === null || typeof value !== 'object') return false;
  return 'appendFindingEvent' in value
    && typeof value.appendFindingEvent === 'function'
    && 'findFindingCandidates' in value
    && typeof value.findFindingCandidates === 'function';
}

async function readRows(storePath: string): Promise<Record<string, unknown>[]> {
  const contents = await readFile(storePath, 'utf8');
  if (!contents.endsWith('\n')) throw new Error('findings JSONL must end with a newline');
  return contents.slice(0, -1).split('\n').map((line) => asRecord(JSON.parse(line) as unknown));
}

async function readEvent(storePath: string, index = 0): Promise<Record<string, unknown>> {
  const row = (await readRows(storePath))[index];
  if (row === undefined) throw new Error(`missing findings row ${index}`);
  return asRecord(row['event']);
}

function observation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'observation',
    finding_id: 'finding-1',
    problem: 'the observed behavior is wrong',
    evidence: ['tests/findings.test.ts: observation evidence'],
    source: { origin: 'observed', actor: 'test-harness', reference: 'test-message-1' },
    product: 'vida-powers',
    work_scope: 'VP-6 findings writer',
    blocking_impact: 'non-blocking: isolated test case',
    context: { phase: 'verify', location: 'findings workflow' },
    provenance: ['tests/findings.test.ts'],
    ...overrides,
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('test value is not JSON serializable');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function eventId(event: unknown): string {
  return createHash('sha256').update(canonicalJson(event), 'utf8').digest('hex');
}

function ioFailure(boundary = 'partial write'): Error & { code: string } {
  return Object.assign(new Error(`injected ${boundary}`), { code: 'EIO' });
}

async function expectOriginalFsPromisesNamespace(): Promise<typeof fsPromises> {
  const restored = await import('node:fs/promises');
  expect(Object.keys(restored).sort()).toEqual(Object.keys(originalFsPromises).sort());
  for (const [key, originalValue] of Object.entries(originalFsPromises)) {
    expect(Reflect.get(restored, key)).toBe(originalValue);
  }
  return restored;
}

async function installNativeFault(fault: NativeFault): Promise<NativeFaultControl> {
  let active = true;
  const counts: NativeFaultCounts = {
    readFileErrors: 0,
    openErrors: 0,
    statErrors: 0,
    writes: 0,
    closeCalls: 0,
    closeErrors: 0,
    unlinkErrors: 0,
  };
  const readFile = async (...args: Parameters<typeof fsPromises.readFile>): ReturnType<typeof fsPromises.readFile> => {
    if (active && fault.kind === 'read' && String(args[0]) === fault.path) {
      counts.readFileErrors += 1;
      throw ioFailure('readFile EIO');
    }
    return originalFsPromises.readFile(...args);
  };
  const open = async (...args: Parameters<typeof fsPromises.open>): ReturnType<typeof fsPromises.open> => {
    const path = String(args[0]);
    const flags = args[1];
    if (active && fault.kind === 'open-create' && path === fault.path && flags === 'wx') {
      counts.openErrors += 1;
      throw ioFailure('open wx EIO');
    }
    const handle = await originalOpen(...args);
    if (path !== fault.path) return handle;

    if (active && ((fault.kind === 'handle-stat' && flags === 'r+')
      || (fault.kind === 'handle-stat-close' && flags === 'r+')
      || (fault.kind === 'rollback-stat' && flags === 'wx'))) {
      Object.defineProperty(handle, 'stat', {
        configurable: true,
        value: async () => {
          counts.statErrors += 1;
          throw ioFailure('FileHandle.stat EIO');
        },
      });
      const close = handle.close.bind(handle);
      const closeFails = fault.kind === 'handle-stat-close';
      Object.defineProperty(handle, 'close', {
        configurable: true,
        value: async () => {
          counts.closeCalls += 1;
          await close();
          if (closeFails) {
            counts.closeErrors += 1;
            throw ioFailure('FileHandle.close EIO');
          }
        },
      });
    }

    if (active && ((fault.kind === 'rollback-close' && flags === 'r+')
      || (fault.kind === 'rollback-unlink' && flags === 'wx')
      || (fault.kind === 'rollback-stat' && flags === 'wx'))) {
      Object.defineProperty(handle, 'write', {
        configurable: true,
        value: async (...writeArgs: Parameters<typeof handle.write>) => {
          const data: unknown = writeArgs[0];
          const bytes = data !== null && typeof data === 'object' ? data : null;
          const text = typeof data === 'string'
            ? data
            : bytes instanceof Uint8Array
            ? new TextDecoder().decode(bytes)
            : 'partial write';
          await originalAppendFile(path, text.slice(0, 12), 'utf8');
          counts.writes += 1;
          throw ioFailure('FileHandle.write EIO');
        },
      });
      if (fault.kind === 'rollback-close') {
        const close = handle.close.bind(handle);
        Object.defineProperty(handle, 'close', {
          configurable: true,
          value: async () => {
            counts.closeCalls += 1;
            await close();
            counts.closeErrors += 1;
            throw ioFailure('FileHandle.close EIO');
          },
        });
      }
    }

    return handle;
  };
  const unlink = async (...args: Parameters<typeof fsPromises.unlink>): ReturnType<typeof fsPromises.unlink> => {
    if (active && fault.kind === 'rollback-unlink' && String(args[0]) === fault.path) {
      counts.unlinkErrors += 1;
      throw ioFailure('unlink EIO');
    }
    return originalFsPromises.unlink(...args);
  };
  await mock.module('node:fs/promises', () => ({ ...originalFsPromises, readFile, open, unlink }));
  return {
    counts: () => ({ ...counts }),
    restore: async () => {
      active = false;
      await restoreFsPromisesModule();
    },
  };
}

async function installPartialWriteFailure(
  storePaths: Set<string>,
  rollbackFailurePaths = new Set<string>(),
): Promise<PartialWriteFailureControl> {
  let injectedWrites = 0;
  const appendFile = async (...args: Parameters<typeof fsPromises.appendFile>): ReturnType<typeof fsPromises.appendFile> => {
    const path = args[0];
    if (typeof path !== 'string' || !storePaths.has(path)) return originalAppendFile(...args);
    const handle = await originalOpen(path, 'a');
    try {
      const data = args[1];
      const text = typeof data === 'string'
        ? data
        : data instanceof Uint8Array
        ? new TextDecoder().decode(data)
        : 'partial write';
      await handle.write(text.slice(0, 12), null, 'utf8');
      injectedWrites += 1;
    } finally {
      await handle.close();
    }
    throw ioFailure();
  };
  const open = async (...args: Parameters<typeof fsPromises.open>): ReturnType<typeof fsPromises.open> => {
    const handle = await originalOpen(...args);
    const path = String(args[0]);
    if (!storePaths.has(path)) return handle;
    Object.defineProperty(handle, 'write', {
      configurable: true,
      value: async (...writeArgs: unknown[]) => {
        const data = writeArgs[0];
        const text = typeof data === 'string'
          ? data
          : data instanceof Uint8Array
          ? new TextDecoder().decode(data)
          : 'partial write';
        await originalAppendFile(path, text.slice(0, 12), 'utf8');
        injectedWrites += 1;
        throw ioFailure();
      },
    });
    if (rollbackFailurePaths.has(path)) {
      Object.defineProperty(handle, 'truncate', {
        configurable: true,
        value: async () => { throw ioFailure(); },
      });
    }
    return handle;
  };
  await mock.module('node:fs/promises', () => ({ ...originalFsPromises, appendFile, open }));
  return { injectedWrites: () => injectedWrites, restore: restoreFsPromisesModule };
}

function mergeEvent(): Record<string, unknown> {
  return {
    kind: 'merge',
    canonical_finding_id: 'finding-1',
    duplicate_finding_id: 'finding-2',
    source: { origin: 'observed', actor: 'test-harness', reference: 'equivalence-check-1' },
    evidence: ['the focused reproduction confirms the same defect'],
    context: { phase: 'verify', method: 'reproduction' },
    provenance: ['tests/findings.test.ts'],
  };
}

afterAll(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('appendFindingEvent', () => {
  test('creates one observation and treats exact redelivery as a no-op', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const event = observation();
    expect(existsSync(storePath)).toBe(false);

    const appended = await api.appendFindingEvent(storePath, event);
    const originalBytes = await readFile(storePath, 'utf8');
    const replayed = await api.appendFindingEvent(storePath, event);
    const row = (await readRows(storePath))[0];
    if (row === undefined) throw new Error('persisted observation row is missing');

    expect(appended).toEqual({
      operation: 'append', outcome: 'appended',
      event_id: row['event_id'] as string, candidate_fingerprint: row['candidate_fingerprint'] as string | null,
    });
    expect(replayed).toEqual({ ...appended, outcome: 'replayed' });
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
    expect(await readRows(storePath)).toHaveLength(1);
    expect((await readEvent(storePath))['finding_id']).toBe('finding-1');
  });

  test('records a beyond-scope finding as a blocker with a permission request', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const beyond = observation({ scope: { decision: 'beyond', permission_request: 'Owner approval to extend the work scope is required.' } });
    const appended = await api.appendFindingEvent(storePath, beyond);
    expect(appended.outcome).toBe('appended');
    const row = await readEvent(storePath);
    expect(row['scope']).toEqual({ decision: 'beyond', permission_request: 'Owner approval to extend the work scope is required.' });
    expect(row['blocking_impact']).toBe('non-blocking: isolated test case');
  });

  test('rejects a beyond-scope finding without a permission request and a within-scope one that carries a request', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await expect(api.appendFindingEvent(storePath, observation({ scope: { decision: 'beyond', permission_request: '' } })))
      .rejects.toThrow('FINDING_INVALID');
    await expect(api.appendFindingEvent(storePath, observation({ scope: { decision: 'beyond' } })))
      .rejects.toThrow('FINDING_INVALID');
    await expect(api.appendFindingEvent(storePath, observation({ scope: { decision: 'within', permission_request: 'please' } })))
      .rejects.toThrow('FINDING_INVALID');
    await expect(api.appendFindingEvent(storePath, observation({ scope: { decision: 'elsewhere', permission_request: '' } })))
      .rejects.toThrow('FINDING_INVALID');
    await expect(api.appendFindingEvent(storePath, observation({ scope: { decision: 'within', permission_request: '', extra: true } })))
      .rejects.toThrow('FINDING_INVALID');
    expect(existsSync(storePath)).toBe(false);
    const within = await api.appendFindingEvent(storePath, observation({ scope: { decision: 'within', permission_request: '' } }));
    expect(within.outcome).toBe('appended');
  });

  test('queries full observation rows in append order with every exact reason in fixed order', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const first = observation();
    const firstResult = await api.appendFindingEvent(storePath, first);
    const firstFingerprint = firstResult.candidate_fingerprint;
    if (firstFingerprint === null) throw new Error('observation fingerprint is missing');
    const second = observation({ finding_id: 'finding-2', evidence: ['independent evidence'] });
    await api.appendFindingEvent(storePath, second);

    const result = await api.findFindingCandidates(storePath, first);
    expect(result.event_id).toBe(firstResult.event_id);
    expect(result.finding_id).toBe('finding-1');
    expect(result.candidate_fingerprint).toBe(firstFingerprint);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.event['finding_id'])).toEqual(['finding-1', 'finding-2']);
    expect(result.candidates[0]).toEqual({
      event_id: firstResult.event_id,
      candidate_fingerprint: firstFingerprint,
      event: first,
      reasons: ['event_id', 'finding_id', 'candidate_fingerprint', 'context', 'provenance'],
    });
    expect(result.candidates[1]).toMatchObject({
      event: second,
      reasons: ['candidate_fingerprint', 'context', 'provenance'],
    });

    const idOnly = await api.findFindingCandidates(storePath, observation({
      problem: 'changed problem', finding_id: 'finding-1', context: { changed: true }, provenance: ['changed'],
    }));
    expect(idOnly.candidates.map((candidate) => candidate.reasons)).toEqual([['finding_id']]);
  });

  test('query and append reject duplicate stored observation identities without changing bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const first = observation({ finding_id: 'duplicate-finding-id' });
    await api.appendFindingEvent(storePath, first);
    const firstRow = (await readRows(storePath))[0];
    if (firstRow === undefined) throw new Error('persisted observation row is missing');
    const secondEvent = observation({ finding_id: 'duplicate-finding-id', evidence: ['different evidence'] });
    const secondRow = { ...firstRow, event_id: eventId(secondEvent), event: secondEvent };
    const malformedBytes = `${JSON.stringify(firstRow)}\n${JSON.stringify(secondRow)}\n`;
    await writeFile(storePath, malformedBytes, 'utf8');

    await expect(api.findFindingCandidates(storePath, observation({ finding_id: 'query-finding-id' })))
      .rejects.toThrow('FINDING_STORE_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(malformedBytes);
    await expect(api.appendFindingEvent(storePath, observation({ finding_id: 'new-finding-id' })))
      .rejects.toThrow('FINDING_STORE_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(malformedBytes);
  });

  test('query is read-only and an absent store returns no candidates without creation', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    expect(await api.findFindingCandidates(storePath, observation())).toMatchObject({ candidates: [] });
    expect(existsSync(storePath)).toBe(false);

    await api.appendFindingEvent(storePath, observation());
    const before = await readFile(storePath, 'utf8');
    await api.findFindingCandidates(storePath, observation({ finding_id: 'query-id' }));
    expect(await readFile(storePath, 'utf8')).toBe(before);
  });

  test('empty context matches exactly; empty provenance remains invalid', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const emptyContext = observation({ context: {} });
    await api.appendFindingEvent(storePath, emptyContext);

    const exact = await api.findFindingCandidates(storePath, observation({ finding_id: 'query-exact', context: {} }));
    expect(exact.candidates[0]?.reasons).toContain('context');
    const different = await api.findFindingCandidates(storePath, observation({ finding_id: 'query-different', context: { phase: 'execute' } }));
    expect(different.candidates[0]?.reasons).toEqual(['candidate_fingerprint', 'provenance']);

    await expect(api.appendFindingEvent(storePath, observation({ finding_id: 'empty-provenance', provenance: [] })))
      .rejects.toThrow('FINDING_INVALID');
  });

  test('normalizes object-key order but preserves evidence array order', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const event = observation({ context: { phase: 'verify', details: { first: 1, second: 2 } } });
    const reordered = {
      provenance: ['tests/findings.test.ts'],
      context: { details: { second: 2, first: 1 }, phase: 'verify' },
      blocking_impact: 'non-blocking: isolated test case',
      work_scope: 'VP-6 findings writer',
      product: 'vida-powers',
      source: { reference: 'test-message-1', actor: 'test-harness', origin: 'observed' },
      evidence: ['tests/findings.test.ts: observation evidence'],
      problem: 'the observed behavior is wrong',
      finding_id: 'finding-1',
      kind: 'observation',
    };

    await appendFindingEvent(storePath, event);
    const originalBytes = await readFile(storePath, 'utf8');
    await appendFindingEvent(storePath, reordered);
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
    expect(await readRows(storePath)).toHaveLength(1);

    await expect(appendFindingEvent(storePath, observation({ evidence: ['second', 'first'] })))
      .rejects.toThrow('FINDING_ID_CONFLICT');
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('keeps a same-fingerprint observation separate until an explicit merge event', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    await appendFindingEvent(storePath, observation());
    await appendFindingEvent(storePath, observation({
      finding_id: 'finding-2',
      evidence: ['tests/findings.test.ts: independent evidence'],
    }));

    const beforeMerge = await readRows(storePath);
    expect(beforeMerge).toHaveLength(2);
    expect(beforeMerge.map((row) => row['candidate_fingerprint'])).toEqual([
      beforeMerge[0]?.['candidate_fingerprint'],
      beforeMerge[0]?.['candidate_fingerprint'],
    ]);
    expect((await readEvent(storePath, 1))['evidence']).toEqual(['tests/findings.test.ts: independent evidence']);

    const confirmedMerge = mergeEvent();
    await appendFindingEvent(storePath, confirmedMerge);
    const mergedRows = await readRows(storePath);
    expect(mergedRows).toHaveLength(3);
    const merge = await readEvent(storePath, 2);
    expect(merge['kind']).toBe('merge');
    expect(merge['canonical_finding_id']).toBe('finding-1');
    expect(merge['duplicate_finding_id']).toBe('finding-2');
    expect(merge['evidence']).toEqual(['the focused reproduction confirms the same defect']);

    const mergedBytes = await readFile(storePath, 'utf8');
    await appendFindingEvent(storePath, confirmedMerge);
    expect(await readFile(storePath, 'utf8')).toBe(mergedBytes);
  });

  test('returns ambiguous exact candidates without ranking or merging them', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'ambiguous-1' }));
    await api.appendFindingEvent(storePath, observation({ finding_id: 'ambiguous-2', evidence: ['second evidence'] }));
    await api.appendFindingEvent(storePath, observation({ finding_id: 'ambiguous-3', evidence: ['third evidence'] }));

    const result = await api.findFindingCandidates(storePath, observation({ finding_id: 'ambiguous-query' }));
    expect(result.candidates.map((candidate) => candidate.event['finding_id']))
      .toEqual(['ambiguous-1', 'ambiguous-2', 'ambiguous-3']);
    expect(result.candidates.every((candidate) => candidate.event['kind'] === 'observation')).toBe(true);
    expect(result).not.toHaveProperty('equivalent');
    expect(result).not.toHaveProperty('rank');
    expect((await readRows(storePath)).filter((row) => asRecord(row['event'])['kind'] === 'merge')).toHaveLength(0);
  });

  test('keeps context and provenance conflicts separate and reports a reused-ID conflict', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const base = observation();
    await appendFindingEvent(storePath, base);
    await appendFindingEvent(storePath, observation({
      finding_id: 'finding-context-conflict',
      context: { phase: 'execute', location: 'different context' },
    }));
    await appendFindingEvent(storePath, observation({
      finding_id: 'finding-provenance-conflict',
      provenance: ['reported by a different source'],
    }));

    const rows = await readRows(storePath);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.['candidate_fingerprint']).toBe(rows[1]?.['candidate_fingerprint']);
    expect(rows[0]?.['candidate_fingerprint']).not.toBe(rows[2]?.['candidate_fingerprint']);
    expect((await readEvent(storePath, 1))['context']).toEqual({ phase: 'execute', location: 'different context' });
    expect((await readEvent(storePath, 2))['provenance']).toEqual(['reported by a different source']);

    const originalBytes = await readFile(storePath, 'utf8');
    await expect(appendFindingEvent(storePath, observation({ context: { phase: 'different' } })))
      .rejects.toThrow('FINDING_ID_CONFLICT');
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('validates source identity and the findings store path before filesystem effects', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    await expect(appendFindingEvent(storePath, observation({
      source: { origin: 'observed', actor: 'test-harness', reference: '' },
    }))).rejects.toThrow('FINDING_INVALID');
    expect(existsSync(storePath)).toBe(false);
    await expect(appendFindingEvent(storePath, observation({ provenance: [] }))).rejects.toThrow('FINDING_INVALID');

    const invalidStorePath = join(temporaryDirectories[0] ?? '', 'findings.log');
    await expect(appendFindingEvent(invalidStorePath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
    expect(existsSync(invalidStorePath)).toBe(false);
    const dotComponentPath = `${storePath.substring(0, storePath.lastIndexOf('\\'))}\\..\\findings.jsonl`;
    await expect(appendFindingEvent(dotComponentPath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
  });

  test('rejects a final store symlink without following it', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    const targetPath = join(temporaryDirectories.at(-1) ?? '', 'target-directory');
    await mkdir(targetPath);
    try {
      await symlink(targetPath, storePath, 'junction');
    } catch (error) {
      const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'EPERM' || code === 'EACCES') {
        console.warn(`final store symlink assertion not run: host denied fixture creation (${String(code)})`);
        return;
      }
      throw error;
    }

    await expect(api.findFindingCandidates(storePath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
    await expect(api.appendFindingEvent(storePath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
  });

  test('rejects JSON contexts with symbol keys, hidden fields, or accessors', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const symbolContext = { phase: 'verify' };
    Object.defineProperty(symbolContext, Symbol('private'), { value: 'not JSON' });
    const hiddenContext = { phase: 'verify' };
    Object.defineProperty(hiddenContext, 'hidden', { value: 'not JSON', enumerable: false });
    let getterCalls = 0;
    const accessorContext = { phase: 'verify' };
    Object.defineProperty(accessorContext, 'derived', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'not JSON';
      },
    });

    for (const context of [symbolContext, hiddenContext, accessorContext]) {
      const storePath = await newStore();
      await expect(appendFindingEvent(storePath, observation({ context }))).rejects.toThrow('FINDING_INVALID');
      expect(existsSync(storePath)).toBe(false);
    }
    expect(getterCalls).toBe(0);
  });

  test('rejects missing or non-directory parents before creating a store', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const directory = temporaryDirectories.at(-1);
    if (directory === undefined) throw new Error('temporary findings directory is missing');

    const missingParentPath = join(directory, 'missing-parent', 'findings.jsonl');
    await expect(appendFindingEvent(missingParentPath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
    expect(existsSync(missingParentPath)).toBe(false);

    const parentFile = join(directory, 'parent-file');
    await writeFile(parentFile, 'not a directory', 'utf8');
    const nonDirectoryPath = join(parentFile, 'findings.jsonl');
    await expect(appendFindingEvent(nonDirectoryPath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
    expect(existsSync(storePath)).toBe(false);
    expect(existsSync(nonDirectoryPath)).toBe(false);
  });

  test('preserves an out-of-scope blocker and its permission request without authorizing a fix', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const event = observation({
      finding_id: 'finding-out-of-scope',
      work_scope: 'VP-6 findings writer only',
      blocking_impact: 'blocking; owner permission requested before any scope expansion',
    });
    await appendFindingEvent(storePath, event);

    const persisted = await readEvent(storePath);
    expect(persisted['work_scope']).toBe('VP-6 findings writer only');
    expect(persisted['blocking_impact']).toBe('blocking; owner permission requested before any scope expansion');
    expect(persisted['fix_authorized']).toBeUndefined();
  });

  test('fails closed on malformed existing JSONL bytes and preserves them', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const malformed = '{not-json}\n';
    await writeFile(storePath, malformed, 'utf8');

    await expect(appendFindingEvent(storePath, observation())).rejects.toThrow('FINDING_STORE_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(malformed);
  });

  test('fails closed on a missing final newline and preserves the store bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation());
    const malformed = (await readFile(storePath, 'utf8')).slice(0, -1);
    await writeFile(storePath, malformed, 'utf8');

    await expect(api.findFindingCandidates(storePath, observation({ finding_id: 'query-id' })))
      .rejects.toThrow('FINDING_STORE_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(malformed);
  });

  test('partial write failures restore existing bytes and remove only a newly created store', async () => {
    const api = await loadFindingsApi();
    const existingStore = await newStore();
    await api.appendFindingEvent(existingStore, observation({ finding_id: 'existing-row' }));
    const existingBytes = await readFile(existingStore, 'utf8');
    const absentStore = await newStore();
    const stores = new Set([existingStore, absentStore]);
    const fault = await installPartialWriteFailure(stores);

    await withFaultCleanup(async () => {
      const moduleUrl = new URL('../skills/vp-mode/scripts/findings.ts', import.meta.url);
      moduleUrl.searchParams.set('partial-write-test', `${Date.now()}-${Math.random()}`);
      const failingApi = await import(moduleUrl.href) as FindingsApi;
      const failures: unknown[] = [];
      try {
        await failingApi.appendFindingEvent(existingStore, observation({ finding_id: 'existing-new-row' }));
      } catch (error) {
        failures.push(error);
      }
      try {
        await failingApi.appendFindingEvent(absentStore, observation({ finding_id: 'absent-new-row' }));
      } catch (error) {
        failures.push(error);
      }

      expect(failures).toHaveLength(2);
      expect({
        existingStoreUnchanged: await readFile(existingStore, 'utf8') === existingBytes,
        absentStoreRemainsAbsent: !existsSync(absentStore),
        injectedWrites: fault.injectedWrites(),
      }).toEqual({ existingStoreUnchanged: true, absentStoreRemainsAbsent: true, injectedWrites: 2 });
    }, async () => {
      stores.clear();
      await fault.restore();
    });
    await expectOriginalFsPromisesNamespace();
  });

  test('failed rollback reports recovery required without claiming unchanged bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'recovery-existing-row' }));
    const originalBytes = await readFile(storePath, 'utf8');
    const stores = new Set([storePath]);
    const fault = await installPartialWriteFailure(stores, stores);

    await withFaultCleanup(async () => {
      const moduleUrl = new URL('../skills/vp-mode/scripts/findings.ts', import.meta.url);
      moduleUrl.searchParams.set('rollback-failure-test', `${Date.now()}-${Math.random()}`);
      const failingApi = await import(moduleUrl.href) as FindingsApi;
      let error: unknown;
      try {
        await failingApi.appendFindingEvent(storePath, observation({ finding_id: 'recovery-new-row' }));
      } catch (caught) {
        error = caught;
      }
      const currentBytes = await readFile(storePath, 'utf8');
      expect({
        errorCode: error instanceof Error ? error.message : '',
        injectedWrites: fault.injectedWrites(),
        bytesChangedUnderInjectedRollbackFailure: currentBytes !== originalBytes,
      }).toEqual({
        errorCode: 'FINDING_STORE_RECOVERY_REQUIRED',
        injectedWrites: 1,
        bytesChangedUnderInjectedRollbackFailure: true,
      });
    }, async () => {
      stores.clear();
      await fault.restore();
    });
    await expectOriginalFsPromisesNamespace();
  });

  test('maps a non-ENOENT store read fault to invalid storage and preserves its bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'read-original' }));
    const originalBytes = await readFile(storePath, 'utf8');
    const fault = await installNativeFault({ kind: 'read', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('read');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'read-new' })))
        .rejects.toThrow('FINDING_STORE_INVALID');
      expect(fault.counts()).toMatchObject({ readFileErrors: 1 });
    }, async () => {
      await fault.restore();
    });

    const restoredFsPromises = await expectOriginalFsPromisesNamespace();
    expect(await restoredFsPromises.readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('reports failure to create an absent store and leaves it absent', async () => {
    const storePath = await newStore();
    const fault = await installNativeFault({ kind: 'open-create', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('open-create');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'open-new' })))
        .rejects.toThrow('FINDING_OPERATION_FAILED');
      expect(fault.counts()).toMatchObject({ openErrors: 1 });
    }, async () => {
      await fault.restore();
    });

    expect(existsSync(storePath)).toBe(false);
  });

  test('closes an existing store handle after its stat fault and preserves bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'stat-original' }));
    const originalBytes = await readFile(storePath, 'utf8');
    const fault = await installNativeFault({ kind: 'handle-stat', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('handle-stat');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'stat-new' })))
        .rejects.toThrow('FINDING_OPERATION_FAILED');
      expect(fault.counts()).toMatchObject({ statErrors: 1, closeCalls: 1 });
    }, async () => {
      await fault.restore();
    });

    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('reports operation failure when best-effort close errors after a stat fault', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'stat-close-original' }));
    const originalBytes = await readFile(storePath, 'utf8');
    const fault = await installNativeFault({ kind: 'handle-stat-close', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('handle-stat-close');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'stat-close-new' })))
        .rejects.toThrow('FINDING_OPERATION_FAILED');
      expect(fault.counts()).toMatchObject({ statErrors: 1, closeCalls: 1, closeErrors: 1 });
    }, async () => {
      await fault.restore();
    });

    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('reports recovery required when rollback close errors after restoring prior bytes', async () => {
    const api = await loadFindingsApi();
    const storePath = await newStore();
    await api.appendFindingEvent(storePath, observation({ finding_id: 'close-original' }));
    const originalBytes = await readFile(storePath, 'utf8');
    const fault = await installNativeFault({ kind: 'rollback-close', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('rollback-close');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'close-new' })))
        .rejects.toThrow('FINDING_STORE_RECOVERY_REQUIRED');
      expect(fault.counts()).toMatchObject({ writes: 1, closeCalls: 1, closeErrors: 1 });
    }, async () => {
      await fault.restore();
    });

    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('reports recovery required when rollback cannot unlink a new empty store', async () => {
    const storePath = await newStore();
    const fault = await installNativeFault({ kind: 'rollback-unlink', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('rollback-unlink');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'unlink-new' })))
        .rejects.toThrow('FINDING_STORE_RECOVERY_REQUIRED');
      expect(fault.counts()).toMatchObject({ writes: 1, unlinkErrors: 1 });
    }, async () => {
      await fault.restore();
    });

    expect(existsSync(storePath)).toBe(true);
    expect(await readFile(storePath, 'utf8')).toBe('');
  });

  test('reports recovery required and keeps a new empty store when rollback stat fails', async () => {
    const storePath = await newStore();
    const fault = await installNativeFault({ kind: 'rollback-stat', path: storePath });

    await withFaultCleanup(async () => {
      const failingApi = await loadFreshFindingsApi('rollback-stat');
      await expect(failingApi.appendFindingEvent(storePath, observation({ finding_id: 'rollback-stat-new' })))
        .rejects.toThrow('FINDING_STORE_RECOVERY_REQUIRED');
      expect(fault.counts()).toMatchObject({ statErrors: 1, writes: 1, closeCalls: 1, unlinkErrors: 0 });
    }, async () => {
      await fault.restore();
    });

    expect(existsSync(storePath)).toBe(true);
    expect(await readFile(storePath, 'utf8')).toBe('');
  });

  test('rejects stored event IDs and fingerprints that do not match their event bytes', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    await appendFindingEvent(storePath, observation());
    const row = (await readRows(storePath))[0];
    if (row === undefined) throw new Error('persisted observation row is missing');

    for (const invalidRow of [
      { ...row, event_id: 'forged-event-id' },
      { ...row, candidate_fingerprint: 'forged-fingerprint' },
    ]) {
      const originalBytes = `${JSON.stringify(invalidRow)}\n`;
      await writeFile(storePath, originalBytes, 'utf8');
      await expect(appendFindingEvent(storePath, observation({ finding_id: 'new-finding' })))
        .rejects.toThrow('FINDING_STORE_INVALID');
      expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
    }
  });

  test('rejects merge events unless both observations and explicit evidence exist', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    await expect(appendFindingEvent(storePath, mergeEvent())).rejects.toThrow('FINDING_MERGE_TARGET_MISSING');
    expect(existsSync(storePath)).toBe(false);

    await appendFindingEvent(storePath, observation());
    await appendFindingEvent(storePath, observation({ finding_id: 'finding-2' }));
    const before = await readFile(storePath, 'utf8');
    await expect(appendFindingEvent(storePath, { ...mergeEvent(), evidence: [] }))
      .rejects.toThrow('FINDING_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(before);
  });

  test('rejects a persisted merge whose observation rows are missing and preserves it', async () => {
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    await appendFindingEvent(storePath, observation());
    await appendFindingEvent(storePath, observation({ finding_id: 'finding-2' }));
    await appendFindingEvent(storePath, mergeEvent());
    const mergeRow = (await readRows(storePath))[2];
    if (mergeRow === undefined) throw new Error('persisted merge row is missing');
    const originalBytes = `${JSON.stringify(mergeRow)}\n`;
    await writeFile(storePath, originalBytes, 'utf8');

    await expect(appendFindingEvent(storePath, observation({ finding_id: 'finding-3' })))
      .rejects.toThrow('FINDING_STORE_INVALID');
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });
});
