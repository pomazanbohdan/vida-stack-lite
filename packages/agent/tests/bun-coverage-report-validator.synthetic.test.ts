/**
 * Native validator contract owner; synthetic data only.
 * Every positive receipt remains UNTRUSTED SYNTHETIC VALIDATOR FIXTURE data:
 * acceptance demonstrates structural consistency only, never genuine producer
 * provenance, executed coverage, or numeric coverage qualification.
 */
import { expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateCoverageReport } from '../tooling/bun-coverage-report-validator.ts';
import {
  capturedModuleAbsolutePath,
  canonicalCapturedModulePath,
  repositoryRootForPackage,
  repositoryToolingInputPrefix,
} from '../tooling/bun-coverage-evidence.ts';
import { createSyntheticCoverageFixture, type SyntheticFixture } from './synthetic-coverage-fixture.ts';

const expectedFixtureSources = [
  'bin/cli-metadata.ts',
  'src/host-state.ts',
  'src/lifecycle/lifecycle-state.ts',
  'src/orchestration/persistent-session-handoff.ts',
  'src/orchestration/session-handoff.ts',
  'src/runtime-kernel.ts',
];

test('maps only the canonical repository tooling namespace to its checkout path', () => {
  const packageRoot = path.resolve('/synthetic/repository/packages/agent');
  const actual = path.resolve('/synthetic/repository/tooling/agent/release-assurance.ts');
  const logical = `${repositoryToolingInputPrefix}/release-assurance.ts`;
  expect(canonicalCapturedModulePath(packageRoot, actual)).toBe(logical);
  expect(capturedModuleAbsolutePath(packageRoot, logical)).toBe(actual);
  expect(
    canonicalCapturedModulePath(packageRoot, path.resolve('/synthetic/repository/tooling/sibling/escape.ts')),
  ).toBeNull();
  expect(
    canonicalCapturedModulePath(packageRoot, path.resolve(packageRoot, '_repository/tooling/agent/escape.ts')),
  ).toBeNull();
  expect(() => capturedModuleAbsolutePath(packageRoot, '_repository/tooling/sibling/escape.ts')).toThrow(
    /outside admitted roots/u,
  );
  const nonstandardPackageRoot = path.resolve('/synthetic/not-the-agent-package');
  expect(repositoryRootForPackage(nonstandardPackageRoot)).toBeNull();
  expect(() => capturedModuleAbsolutePath(nonstandardPackageRoot, logical)).toThrow(/outside admitted roots/u);
});

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`Missing fixture record: ${label}`);
  return value as Record<string, unknown>;
}

async function rejects(fixture: SyntheticFixture, bytes: Uint8Array, expected: RegExp): Promise<void> {
  let caught: unknown;
  try {
    await validateCoverageReport(fixture.reportPath, fixture.root, {
      reportBytes: bytes,
      requireFullCoverage: false,
    });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  if (!(caught instanceof Error)) return;
  expect(caught.message).toMatch(expected);
}

async function withFixture(action: (fixture: SyntheticFixture) => Promise<void>): Promise<void> {
  const fixture = await createSyntheticCoverageFixture();
  let passed = false;
  try {
    await action(fixture);
    passed = true;
  } finally {
    // Keep failed artifacts available for root's diagnosis.
    if (passed) fixture.remove();
    else console.error(`Preserved failed synthetic coverage fixture at ${fixture.root}`);
  }
}

test('accepts a coherent UNTRUSTED synthetic report with full coverage disabled', async () => {
  await withFixture(async (fixture) => {
    const result = await validateCoverageReport(fixture.reportPath, fixture.root, {
      reportBytes: fixture.reportBytes(),
      requireFullCoverage: false,
    });
    const expectedRunId = fixture.report.run_id;
    if (typeof expectedRunId !== 'string') throw new Error('Synthetic run identity is missing.');
    expect(result.report.run_id).toBe(expectedRunId);
    expect(result.processes).toBe(1);
    expect(result.maintained_sources.map(({ path: source }) => source)).toEqual(expectedFixtureSources);
    // The downstream gate receives Source-generated maps, never a decoded
    // report-owned object. This is map custody, not executed coverage evidence.
    expect(result).toHaveProperty('canonical_source_maps', expect.any(Object));
    const canonicalMaps = record(Reflect.get(result, 'canonical_source_maps'), 'canonical Source maps');
    expect(canonicalMaps).toEqual(record(fixture.report.source_maps, 'serialized Source maps'));
    expect(canonicalMaps).not.toBe(result.report.source_maps);
    expect(canonicalMaps).not.toBe(result.manifest.source_maps);
    expect(Object.keys(canonicalMaps).sort()).toEqual(
      expectedFixtureSources.map((source) => path.resolve(fixture.root, source)).sort(),
    );
    // Deliberately make no percentage or coverage qualification assertion.
  });
});

test('rejects an UNTRUSTED synthetic report that omits a selected source binding', async () => {
  await withFixture(async (fixture) => {
    const sources = fixture.report.sources;
    if (!Array.isArray(sources)) throw new Error('Synthetic report sources are missing.');
    fixture.report.sources = sources.slice(1);
    await rejects(fixture, fixture.reportBytes(), /Coverage input changed since collection: sources/u);
  });
});

test('rejects live Source changes after the UNTRUSTED synthetic capture', async () => {
  await withFixture(async (fixture) => {
    const sources = fixture.report.sources;
    if (!Array.isArray(sources) || sources.length === 0) throw new Error('Synthetic report sources are missing.');
    const firstSource = record(sources[0], 'first source');
    if (typeof firstSource.path !== 'string') throw new Error('Synthetic source path is missing.');
    writeFileSync(path.join(fixture.root, firstSource.path), 'export const changedAfterCapture = true;\n');
    await rejects(fixture, fixture.reportBytes(), /Coverage input changed since collection: sources/u);
  });
});

test('rejects snapshot drift for an otherwise unchanged UNTRUSTED synthetic run', async () => {
  await withFixture(async (fixture) => {
    const tests = fixture.report.tests;
    if (!Array.isArray(tests) || typeof tests[0] !== 'string') throw new Error('Synthetic selected test is missing.');
    const selectedTest = tests[0];
    const driftedPath = path.join(fixture.snapshotDirectory, selectedTest);
    mkdirSync(path.dirname(driftedPath), { recursive: true });
    writeFileSync(driftedPath, 'snapshot drift after synthetic capture\n');
    await rejects(fixture, fixture.reportBytes(), /Coverage input differs from its snapshot:/u);
  });
});

test('routes malformed hash-rebound synthetic counters through shared Istanbul validation', async () => {
  await withFixture(async (fixture) => {
    const childCoverage = record(fixture.child.coverage, 'child coverage');
    const absoluteSource = Object.keys(childCoverage)[0];
    if (!absoluteSource) throw new Error('Synthetic child coverage is empty.');
    const sourceCoverage = record(childCoverage[absoluteSource], 'first source coverage');
    const counters = record(sourceCoverage.s, 'statement counters');
    const firstCounter = Object.keys(counters)[0];
    if (!firstCounter) throw new Error('Minimal instrumented Source did not produce a statement counter.');
    const bytes = fixture.rewriteChildAndReceiptHash((child) => {
      const coverage = record(child.coverage, 'child coverage');
      const source = record(coverage[absoluteSource], 'first source coverage');
      const statementCounters = record(source.s, 'statement counters');
      statementCounters[firstCounter] = -1;
    });
    // This writes the child bytes, updates their receipt SHA, and matches final counters.
    await rejects(fixture, bytes, /Invalid counter:/u);
  });
});

test('current synthetic coverage rejects historical reference metadata even with otherwise coherent custody', async () => {
  await withFixture(async (fixture) => {
    fixture.report.published_reference = { schema: 'PublishedBaselineReference/v1', kind: 'measurement_admitted' };
    await rejects(fixture, fixture.reportBytes(), /Current coverage cannot adopt historical reference admission/u);
  });
});

test('current synthetic coverage rejects a known failed suite without historical metadata', async () => {
  await withFixture(async (fixture) => {
    fixture.report.shards = [{ shard_id: 'bun-test', status: 1, signal: null, error: null, unknown: false }];
    await rejects(fixture, fixture.reportBytes(), /did not finish with a clean terminal result/u);
  });
});

test('shared public entrypoint denies altered process receipt custody', async () => {
  await withFixture(async (fixture) => {
    const receipts = fixture.report.processes;
    if (!Array.isArray(receipts) || typeof receipts[0] !== 'object' || receipts[0] === null)
      throw new Error('Synthetic process receipt is missing.');
    Reflect.set(receipts[0], 'file', 'foreign-process.json');
    await rejects(fixture, fixture.reportBytes(), /Coverage process receipt filename is invalid or duplicated/u);
  });
});
