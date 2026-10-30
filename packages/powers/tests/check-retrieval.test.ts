import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkRetrievalReport,
  parseReport,
  runRetrievalCli,
  startRetrievalCli,
} from '../scripts/check-retrieval.ts';

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(here, '../catalog.json');
const scriptPath = join(here, '../scripts/check-retrieval.ts');
const directories: string[] = [];

async function reportFile(value: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-retrieval-check-'));
  directories.push(directory);
  const path = join(directory, 'report.json');
  await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  return path;
}

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

const goodReport = {
  intents: [
    { name: 'diagnosis', terms: ['diagnosis', 'intermittent', '500'], ids: ['debug-systematically'] },
    { name: 'verification', terms: ['completion', 'verification', 'acceptance'], ids: ['call-a-fix-verified-only-when-all-five-conditions-hold'] },
  ],
};

test('accepts a report whose intents resolve and whose ids fit the intent', async () => {
  const result = await checkRetrievalReport(catalogPath, await reportFile(goodReport));
  expect(result.ok).toBe(true);
  expect(result.issues).toEqual([]);
  expect(result.intents[0]?.capability).toBe('debug-root-cause');
  expect(result.intents[0]?.weak).toBe(false);
  expect(result.alias_coverage.reachable).toBeGreaterThanOrEqual(8);
});

test('rejects an unknown id, a reused id and an id outside the intent', async () => {
  const unknown = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'diagnosis', terms: ['diagnosis'], ids: ['not-an-instruction'] }],
  }));
  expect(unknown.ok).toBe(false);
  expect(unknown.issues.map((issue) => issue.code)).toContain('RETRIEVAL_ID_UNKNOWN');

  const reused = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [
      { name: 'one', terms: ['diagnosis'], ids: ['debug-systematically'] },
      { name: 'two', terms: ['observability'], ids: ['debug-systematically'] },
    ],
  }));
  expect(reused.issues.map((issue) => issue.code)).toContain('RETRIEVAL_ID_REUSED');

  const misplaced = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'observability', terms: ['observability', 'alerting'], ids: ['debug-systematically'] }],
  }));
  expect(misplaced.issues.map((issue) => issue.code)).toContain('RETRIEVAL_ID_NOT_IN_INTENT');
});

test('accepts a declared canonical tag when the fallback changed the terms', async () => {
  const declared = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [
      {
        name: 'solution-option-exploration',
        terms: ['solution', 'option', 'exploration', 'alternatives', 'tradeoffs'],
        capability: 'generate-idea-variations',
        ids: ['generate-a-bounded-set-of-variations', 'look-for-structural-analogies'],
      },
    ],
  }));
  expect(declared.ok).toBe(true);
  expect(declared.intents[0]?.status).toBe('declared');
  expect(declared.intents[0]?.capability).toBe('generate-idea-variations');

  const unknownTag = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'x', terms: ['diagnosis'], capability: 'not-a-capability', ids: ['debug-systematically'] }],
  }));
  expect(unknownTag.issues.map((issue) => issue.code)).toContain('RETRIEVAL_TAG_UNKNOWN');

  const unknownPattern = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'x', terms: ['diagnosis'], pattern: 'not-a-pattern', ids: ['debug-systematically'] }],
  }));
  expect(unknownPattern.issues.map((issue) => issue.code)).toContain('RETRIEVAL_TAG_UNKNOWN');

  const emptyTag = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'x', terms: ['diagnosis'], capability: '', ids: ['debug-systematically'] }],
  }));
  expect(emptyTag.issues.map((issue) => issue.code)).toContain('RETRIEVAL_REPORT_INVALID');

  const emptyPattern = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'x', terms: ['diagnosis'], pattern: '', ids: ['debug-systematically'] }],
  }));
  expect(emptyPattern.issues.map((issue) => issue.code)).toContain('RETRIEVAL_REPORT_INVALID');
});

test('reports an unresolved intent separately from empty and malformed reports', async () => {
  const unresolved = await checkRetrievalReport(catalogPath, await reportFile({
    intents: [{ name: 'nothing', terms: ['zzzznotatag'], ids: ['debug-systematically'] }],
  }));
  expect(unresolved.issues.map((issue) => issue.code)).toContain('RETRIEVAL_INTENT_UNRESOLVED');

  const empty = await checkRetrievalReport(catalogPath, await reportFile({ intents: [{ name: 'x', terms: ['diagnosis'], ids: [] }] }));
  expect(empty.ok).toBe(false);
  expect(empty.issues.map((issue) => issue.code)).toContain('RETRIEVAL_INTENT_EMPTY');
  expect(empty.intents).toEqual([]);

  expect(parseReport('nope').issues[0]?.code).toBe('RETRIEVAL_REPORT_INVALID');
  expect(parseReport({ intents: [] }).issues[0]?.code).toBe('RETRIEVAL_REPORT_INVALID');
  expect(parseReport({ intents: [null] }).issues[0]?.code).toBe('RETRIEVAL_REPORT_INVALID');
  expect(parseReport({ intents: [{ terms: ['x'], ids: ['y'] }] }).issues.map((issue) => issue.code)).toContain('RETRIEVAL_REPORT_INVALID');
  expect(parseReport({ intents: [{ name: 'x', terms: [], ids: ['y'] }] }).issues.map((issue) => issue.code)).toContain('RETRIEVAL_REPORT_INVALID');
});

test('the CLI prints a result, a usage line, or a failure with the matching exit code', async () => {
  const out: string[] = [];
  const err: string[] = [];
  const io = { out: (text: string) => out.push(text), err: (text: string) => err.push(text) };

  expect(await runRetrievalCli([], io)).toBe(2);
  expect(err.join('')).toContain('usage: check-retrieval.ts');
  expect(await runRetrievalCli(['--catalog', catalogPath], io)).toBe(2);

  expect(await runRetrievalCli(['--catalog', catalogPath, '--report', await reportFile('{not json')], io)).toBe(2);
  expect(err.join('')).toContain('RETRIEVAL_CHECK_FAILED');

  expect(await runRetrievalCli(['--catalog', catalogPath, '--report', await reportFile(goodReport)], io)).toBe(0);
  expect(out.join('')).toContain('"ok": true');

  expect(await runRetrievalCli(['--catalog', catalogPath, '--report', await reportFile({ intents: [] })], io)).toBe(1);
});

test('reads the intent map from stdin when --report is a dash', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--catalog', catalogPath, '--report', '-'], {
    input: JSON.stringify(goodReport),
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"ok": true');
  expect(result.stdout).toContain('debug-root-cause');
});

test('the entry point guard ignores an unrelated argv and runs when invoked directly', async () => {
  expect(await startRetrievalCli(['bun', 'other.ts'])).toBeUndefined();

  const originalWrite = process.stdout.write;
  const originalErrorWrite = process.stderr.write;
  const originalExit = process.exitCode;
  const captured: string[] = [];
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    captured.push(String(chunk));
    return true;
  };
  process.stderr.write = (chunk: string | Uint8Array): boolean => {
    captured.push(String(chunk));
    return true;
  };
  try {
    expect(await startRetrievalCli(['bun', scriptPath])).toBe(2);
    const code = await startRetrievalCli(['bun', scriptPath, '--catalog', catalogPath, '--report', await reportFile(goodReport)]);
    expect(code).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(captured.join('')).toContain('"ok": true');
    expect(captured.join('')).toContain('usage: check-retrieval.ts');
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErrorWrite;
    process.exitCode = originalExit;
  }
});
