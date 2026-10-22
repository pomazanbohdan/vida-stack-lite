import { afterAll, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectories: string[] = [];

async function newStore(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-findings-'));
  temporaryDirectories.push(directory);
  return join(directory, 'findings.jsonl');
}

async function loadAppendFindingEvent(): Promise<(storePath: string, event: unknown) => Promise<void>> {
  const module = await import('../skills/vp-mode/scripts/findings.ts').catch(() => null);
  expect(module).not.toBeNull();
  if (module === null) throw new Error('findings module is unavailable');
  return module.appendFindingEvent;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected a JSON object');
  }
  return value as Record<string, unknown>;
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
    const appendFindingEvent = await loadAppendFindingEvent();
    const storePath = await newStore();
    const event = observation();
    expect(existsSync(storePath)).toBe(false);

    await appendFindingEvent(storePath, event);
    const originalBytes = await readFile(storePath, 'utf8');
    await appendFindingEvent(storePath, event);

    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
    expect(await readRows(storePath)).toHaveLength(1);
    expect((await readEvent(storePath))['finding_id']).toBe('finding-1');
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

    const invalidStorePath = join(temporaryDirectories[0] ?? '', 'findings.log');
    await expect(appendFindingEvent(invalidStorePath, observation())).rejects.toThrow('FINDING_STORE_PATH_INVALID');
    expect(existsSync(invalidStorePath)).toBe(false);
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
