/**
 * Native validator contract owner; synthetic data only.
 * Every positive receipt remains UNTRUSTED SYNTHETIC VALIDATOR FIXTURE data:
 * acceptance demonstrates structural consistency only, never genuine producer
 * provenance, executed coverage, or numeric coverage qualification.
 */
import { expect, test } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import path from 'node:path';
import { validateCoverageReport, validateFocusedCoverageReport } from '../tooling/bun-coverage-report-validator.ts';
import {
  capturedModuleAbsolutePath,
  canonicalCapturedModulePath,
  repositoryRootForPackage,
  repositoryToolingInputPrefix,
  type FocusedDiagnosticSelection,
} from '../tooling/bun-coverage-evidence.ts';
import {
  createSyntheticCoverageFixture,
  syntheticFixtureSourcePaths,
  syntheticFixtureTestPath,
  type SyntheticFixture,
} from './synthetic-coverage-fixture.ts';

const expectedFixtureSources = syntheticFixtureSourcePaths;

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

async function withFixture(action: (fixture: SyntheticFixture) => Promise<void>, focused = false): Promise<void> {
  const fixture = await createSyntheticCoverageFixture({ focused });
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

const withFocusedFixture = (action: (fixture: SyntheticFixture) => Promise<void>) => withFixture(action, true);

async function withVersionedFixture(action: (fixture: SyntheticFixture) => Promise<void>): Promise<void> {
  const fixture = await createSyntheticCoverageFixture({ versionedShards: true });
  let passed = false;
  try {
    await action(fixture);
    passed = true;
  } finally {
    if (passed) fixture.remove();
    else console.error(`Preserved failed versioned synthetic coverage fixture at ${fixture.root}`);
  }
}

async function bindSyntheticFocusedReport(fixture: SyntheticFixture): Promise<FocusedDiagnosticSelection> {
  const selection: FocusedDiagnosticSelection = {
    mode: 'focused-diagnostic',
    contour: 'synthetic-validator-contour',
    sources: (fixture.report.sources as Array<{ path: string }>).map(({ path: file }) => file),
    tests: [syntheticFixtureTestPath],
  };
  fixture.rewriteChildAndReceiptHash((childRecord) => {
    for (const key of ['s', 'f', 'b'] as const) {
      const maps = childRecord.coverage as Record<string, Record<string, Record<string, number | number[]>>>;
      for (const source of Object.values(maps)) {
        const counters = source[key];
        if (!counters) throw new Error('Synthetic focused counter map is missing.');
        for (const [counter, value] of Object.entries(counters))
          counters[counter] = Array.isArray(value) ? value.map(() => 1) : 1;
      }
    }
  });
  await Bun.write(fixture.reportPath, JSON.stringify(fixture.report));
  return selection;
}

async function rejectsFocused(
  fixture: SyntheticFixture,
  selection: FocusedDiagnosticSelection,
  expected: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    writeFileSync(fixture.reportPath, JSON.stringify(fixture.report));
    await validateFocusedCoverageReport(fixture.reportPath, fixture.root, selection);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  if (caught instanceof Error) expect(caught.message).toMatch(expected);
}

test('rejects focused reports from the default global validator', async () => {
  await withFocusedFixture(async (fixture) => {
    await bindSyntheticFocusedReport(fixture);
    await rejects(fixture, fixture.reportBytes(), /schema or run identity is invalid/u);
  });
});

test('rejects a focused report bound to another requested contour', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    await rejectsFocused(fixture, { ...selection, contour: 'different-contour' }, /Coverage input changed/u);
  });
});

test('rejects focused reports with the ordinary report schema', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    fixture.report.schema = 'VidaBunCoverageReport/v1';
    await rejectsFocused(fixture, selection, /focused diagnostic schema/u);
  });
});

test('rejects historical admission metadata on focused diagnostics', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    fixture.report.published_reference = { kind: 'measurement_admitted' };
    await rejectsFocused(fixture, selection, /cannot admit historical coverage/u);
  });
});

test('keeps exact full coverage mandatory for focused diagnostics', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    fixture.rewriteChildAndReceiptHash((child) => {
      const files = record(child.coverage, 'synthetic coverage');
      const file = record(Object.values(files)[0], 'synthetic file');
      const functions = record(file.f, 'synthetic functions');
      const first = Object.keys(functions)[0];
      if (!first) throw new Error('Focused fixture requires a genuine function denominator.');
      functions[first] = 0;
    });
    await rejectsFocused(fixture, selection, /Coverage is not exact 100%/u);
  });
});

test('rejects focused aggregate counters that differ from checked process counters', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    const maps = record(fixture.report.coverage, 'synthetic focused counters');
    const firstFile = record(Object.values(maps)[0], 'synthetic focused file');
    const statements = record(firstFile.s, 'synthetic focused statements');
    const firstStatement = Object.keys(statements)[0];
    if (!firstStatement) throw new Error('Synthetic focused file has no statement counter.');
    statements[firstStatement] = 0;
    await rejectsFocused(fixture, selection, /Final counters do not equal merged process counters/u);
  });
});

test('rejects focused reports with a faulted process receipt fingerprint', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    const receipt = record((fixture.report.processes as unknown[])[0], 'synthetic process receipt');
    receipt.sha256 = '0'.repeat(64);
    await rejectsFocused(fixture, selection, /process receipt fingerprint mismatch/u);
  });
});

test('validates exact UNTRUSTED focused fixture custody in its diagnostic namespace only', async () => {
  await withFocusedFixture(async (fixture) => {
    const selection = await bindSyntheticFocusedReport(fixture);
    const result = await validateFocusedCoverageReport(fixture.reportPath, fixture.root, selection);
    expect(result.report.schema).toBe('VidaBunFocusedCoverageDiagnostic/v1');
    expect(result.totals.functions).toMatchObject({ covered: 6, total: 6, pct: 100 });
    expect(result.report_sha256).toBe(sha256(readFileSync(fixture.reportPath)));
    await rejects(fixture, fixture.reportBytes(), /schema or run identity is invalid/u);
  });
});

test('accepts an UNTRUSTED v3 run with two exact v2 shard receipts and one sparse checked merge', async () => {
  await withVersionedFixture(async (fixture) => {
    const childCoverage = record(fixture.child.coverage, 'synthetic child coverage');
    const hitFile = Object.keys(childCoverage)[0];
    if (!hitFile) throw new Error('Versioned fixture has no observed Source map.');
    const statementCounts = record(
      record(childCoverage[hitFile], 'synthetic child Source').s,
      'synthetic statement counts',
    );
    const hitStatement = Object.keys(statementCounts)[0];
    if (!hitStatement || statementCounts[hitStatement] !== 0)
      throw new Error('Versioned fixture has no zero-seeded statement.');
    const bytes = fixture.rewriteChildAndReceiptHash(() => {
      statementCounts[hitStatement] = 2;
    });
    const result = await validateCoverageReport(fixture.reportPath, fixture.root, {
      reportBytes: bytes,
      requireFullCoverage: false,
    });
    expect(result.manifest.schema).toBe('VidaBunCoverageRun/v3');
    expect(result.processes).toBe(2);
    expect(fixture.report.tests).toEqual(fixture.manifest.tests);
    expect(fixture.report.schema).toBe('VidaBunCoverageReport/v2');
    expect(Object.hasOwn(fixture.report, 'coverage')).toBe(false);
    expect(result.coverage[hitFile]?.s[hitStatement]).toBe(2);
    expect(
      record(record(record(fixture.report.source_maps, 'sealed maps')[hitFile], 'sealed Source').s, 'sealed counts')[
        hitStatement
      ],
    ).toBe(0);
    expect(result.coverage).not.toBe(fixture.report.source_maps);
    expect(JSON.stringify(result.canonical_source_maps)).toBe(JSON.stringify(fixture.report.source_maps));
  });
});

test.each(['VidaBunCoverageReport/v2', 'VidaBunCoverageReport/v1'] as const)(
  'rejects %s counters for a Source absent from that shard loaded-input receipt',
  async (schema) => {
    await withVersionedFixture(async (fixture) => {
      const childCoverage = record(fixture.child.coverage, 'synthetic child coverage');
      const hitFile = Object.keys(childCoverage)[0];
      if (!hitFile) throw new Error('Versioned fixture has no observed Source map.');
      const logicalSource = path.relative(fixture.root, hitFile).replaceAll(path.sep, '/');
      const statementCounts = record(
        record(childCoverage[hitFile], 'synthetic child Source').s,
        'synthetic statement counts',
      );
      const hitStatement = Object.keys(statementCounts)[0];
      const loaded = unknownArray(fixture.child.loaded_inputs);
      if (!hitStatement || statementCounts[hitStatement] !== 0 || !loaded)
        throw new Error('Versioned fixture has no zero-seeded Source counter or loaded-input receipt.');
      const sourceIndex = loaded.findIndex((entry) => record(entry, 'loaded input').path === logicalSource);
      if (sourceIndex < 0) throw new Error('Versioned fixture omitted its loaded Source input.');

      const bytes = fixture.rewriteChildAndReceiptHash(() => {
        // Keep the map canonical and all other receipt evidence while removing
        // only the corresponding loaded-Source row.
        statementCounts[hitStatement] = 2;
        loaded.splice(sourceIndex, 1);
        fixture.child.loaded_inputs = loaded;
      });
      if (schema === 'VidaBunCoverageReport/v1') {
        fixture.report.schema = schema;
        const aggregate = structuredClone(record(fixture.report.source_maps, 'sealed source maps'));
        aggregate[hitFile] = structuredClone(childCoverage[hitFile]);
        fixture.report.coverage = aggregate;
      }

      await rejects(
        fixture,
        schema === 'VidaBunCoverageReport/v1' ? fixture.reportBytes() : bytes,
        /Coverage process counters include an unloaded Source/u,
      );
    });
  },
);

test('rejects serial report/v1 zero-valued Source map absent from its loaded-input receipt', async () => {
  await withFixture(async (fixture) => {
    const childCoverage = record(fixture.child.coverage, 'synthetic child coverage');
    const hitFile = Object.keys(childCoverage)[0];
    if (!hitFile) throw new Error('Serial fixture has no observed Source map.');
    const logicalSource = path.relative(fixture.root, hitFile).replaceAll(path.sep, '/');
    const statementCounts = record(
      record(childCoverage[hitFile], 'synthetic child Source').s,
      'synthetic statement counts',
    );
    const hitStatement = Object.keys(statementCounts)[0];
    const loaded = unknownArray(fixture.child.loaded_inputs);
    if (!hitStatement || statementCounts[hitStatement] !== 0 || !loaded)
      throw new Error('Serial fixture has no zero-seeded Source counter or loaded-input receipt.');
    const sourceIndex = loaded.findIndex((entry) => record(entry, 'loaded input').path === logicalSource);
    if (sourceIndex < 0) throw new Error('Serial fixture omitted its loaded Source input.');

    const bytes = fixture.rewriteChildAndReceiptHash(() => {
      loaded.splice(sourceIndex, 1);
      fixture.child.loaded_inputs = loaded;
    });
    await rejects(fixture, bytes, /Coverage process counters include an unloaded Source/u);
  });
});

test.each([null, {}])('rejects v2 raw reports with forged aggregate field %j', async (aggregate) => {
  await withVersionedFixture(async (fixture) => {
    fixture.report.coverage = aggregate;
    await rejects(fixture, fixture.reportBytes(), /Aggregate counters are forbidden in coverage report v2/u);
  });
});

test('rejects unknown report v2 wire fields', async () => {
  await withVersionedFixture(async (fixture) => {
    fixture.report.legacy_coverage = {};
    await rejects(fixture, fixture.reportBytes(), /unknown or missing fields/u);
  });
});

test('rejects report v2 when paired with a serial manifest', async () => {
  await withVersionedFixture(async (fixture) => {
    fixture.manifest.schema = 'VidaBunCoverageRun/v2';
    await rejects(fixture, manifestBytes(fixture), /Coverage report v2 requires a versioned current manifest/u);
  });
});

test('rejects report v2 historical metadata and historical selection', async () => {
  await withVersionedFixture(async (fixture) => {
    fixture.report.published_reference = { schema: 'PublishedBaselineReference/v1', kind: 'measurement_admitted' };
    await rejects(fixture, fixture.reportBytes(), /Historical reference admission is forbidden in coverage report v2/u);
  });
  await withVersionedFixture(async (fixture) => {
    fixture.report.test_selection = { mode: 'published-baseline-bun-native', tests: [] };
    await rejects(fixture, fixture.reportBytes(), /test selection|test_selection|Coverage input changed/u);
  });
});

test('preserves aggregate-checked report v1 compatibility with a v3 manifest', async () => {
  await withVersionedFixture(async (fixture) => {
    fixture.report.schema = 'VidaBunCoverageReport/v1';
    fixture.report.coverage = structuredClone(fixture.report.source_maps);
    const result = await validateCoverageReport(fixture.reportPath, fixture.root, {
      reportBytes: fixture.reportBytes(),
      requireFullCoverage: false,
    });
    expect(JSON.stringify(result.coverage)).toBe(JSON.stringify(fixture.report.coverage));
  });
});

test.each(['relative', 'inside-package'])('rejects a versioned manifest with %s temporary root', async (kind) => {
  await withVersionedFixture(async (fixture) => {
    fixture.manifest.shard_temporary_root = kind === 'relative' ? 'tmp' : path.join(fixture.root, 'tmp');
    const manifestBytes = Buffer.from(JSON.stringify(fixture.manifest));
    const manifestPath = fixture.report.manifest_path;
    if (typeof manifestPath !== 'string') throw new Error('Synthetic manifest path is malformed.');
    writeFileSync(path.join(fixture.root, manifestPath), manifestBytes);
    fixture.report.manifest_sha256 = sha256(manifestBytes);
    await rejects(fixture, fixture.reportBytes(), /temporary root must be canonical|outside/u);
  });
});

test('rejects a v3 child that claims its sibling test while retaining both shard receipts', async () => {
  await withVersionedFixture(async (fixture) => {
    const selected = unknownArray(fixture.report.tests);
    if (!selected || selected.length !== 2 || typeof selected[0] !== 'string' || typeof selected[1] !== 'string')
      throw new Error('Versioned synthetic fixture needs exactly two selected tests.');
    const bytes = fixture.rewriteChildAndReceiptHash((child) => {
      const claimed = unknownArray(child.assigned_tests);
      const digestRows = unknownArray(fixture.manifest.test_inputs);
      const childTest = claimed?.[0];
      const siblingTest = selected.find((test) => test !== childTest);
      if (typeof childTest !== 'string' || !siblingTest || !digestRows)
        throw new Error('Versioned synthetic sibling-claim fixture is malformed.');
      child.assigned_tests = [siblingTest];
      const loaded = unknownArray(child.loaded_inputs);
      const loadedIndex = loaded?.findIndex((entry) => record(entry, 'loaded test input').path === childTest) ?? -1;
      const siblingDigest = digestRows.find(
        (entry) => record(entry, 'global selected test digest').path === siblingTest,
      );
      if (!loaded || loadedIndex < 0 || !siblingDigest)
        throw new Error('Versioned synthetic sibling test digest is missing.');
      loaded[loadedIndex] = { path: siblingTest, sha256: record(siblingDigest, 'sibling digest').sha256 };
      child.loaded_inputs = loaded;
    });
    await rejects(fixture, bytes, /assigned test claim differs/u);
  });
});

test('rejects a v3 child that loads its sibling test while retaining its assigned claim and sibling receipt', async () => {
  await withVersionedFixture(async (fixture) => {
    const selected = unknownArray(fixture.report.tests);
    if (!selected || selected.length !== 2 || typeof selected[0] !== 'string' || typeof selected[1] !== 'string')
      throw new Error('Versioned synthetic fixture needs exactly two selected tests.');
    const bytes = fixture.rewriteChildAndReceiptHash((child) => {
      const claimed = unknownArray(child.assigned_tests);
      const loaded = unknownArray(child.loaded_inputs);
      const digestRows = unknownArray(fixture.manifest.test_inputs);
      const assignedTest = claimed?.[0];
      const siblingTest = selected.find((test) => test !== assignedTest);
      const siblingDigest = digestRows?.find(
        (entry) => record(entry, 'global selected test digest').path === siblingTest,
      );
      if (typeof assignedTest !== 'string' || !siblingTest || !loaded || !siblingDigest)
        throw new Error('Versioned synthetic sibling-load fixture is malformed.');
      loaded.push({ path: siblingTest, sha256: record(siblingDigest, 'sibling digest').sha256 });
      child.loaded_inputs = loaded;
    });
    await rejects(fixture, bytes, /Coverage shard loaded a sibling test outside its assignment/u);
  });
});

function unknownArray(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const entry: unknown = value[index];
    entries.push(entry);
  }
  return entries;
}

test('rejects a v3 child with a foreign source inventory while retaining its valid sibling receipt', async () => {
  await withVersionedFixture(async (fixture) => {
    const bytes = fixture.rewriteChildAndReceiptHash((child) => {
      child.sources = [];
    });
    await rejects(fixture, bytes, /source inventory differs/u);
  });
});

function manifestBytes(fixture: SyntheticFixture): Uint8Array {
  const bytes = Buffer.from(JSON.stringify(fixture.manifest));
  writeFileSync(path.join(fixture.root, String(fixture.report.manifest_path)), bytes);
  fixture.report.manifest_sha256 = sha256(bytes);
  return fixture.reportBytes();
}

function instrumentedRows(fixture: SyntheticFixture): Array<Record<string, unknown>> {
  const rows = fixture.manifest.instrumented_sources;
  if (!Array.isArray(rows)) throw new Error('Synthetic instrumented source rows are missing.');
  if (rows.length === 0) throw new Error('Synthetic instrumented source rows are empty.');
  for (const row of rows) record(row, 'instrumented source row');
  return rows as Array<Record<string, unknown>>;
}

function artifactPath(fixture: SyntheticFixture, row: Record<string, unknown>): string {
  if (typeof row.artifact_path !== 'string') throw new Error('Synthetic artifact path is missing.');
  return path.join(fixture.root, String(fixture.manifest.snapshot_directory), row.artifact_path);
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
    expect(result.manifest.schema).toBe('VidaBunCoverageRun/v2');
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

test('rejects missing, extra, reordered, or duplicate v2 instrumented source rows', async () => {
  for (const mutate of [
    (_fixture: SyntheticFixture, rows: Array<Record<string, unknown>>) => rows.splice(0, 1),
    (_fixture: SyntheticFixture, rows: Array<Record<string, unknown>>) => rows.push({ ...rows[0]! }),
    (_fixture: SyntheticFixture, rows: Array<Record<string, unknown>>) => rows.reverse(),
    (_fixture: SyntheticFixture, rows: Array<Record<string, unknown>>) => (rows[1] = { ...rows[0]! }),
  ]) {
    await withFixture(async (fixture) => {
      mutate(fixture, instrumentedRows(fixture));
      await rejects(fixture, manifestBytes(fixture), /instrumented-source|instrumented artifact/u);
    });
  }
});

test('rejects v2 rows bound to a wrong Source digest or noncanonical artifact path', async () => {
  for (const mutate of [
    (row: Record<string, unknown>) => (row.source_sha256 = '0'.repeat(64)),
    (row: Record<string, unknown>) => (row.artifact_path = '../src/host-state.ts'),
    (row: Record<string, unknown>) => (row.artifact_path = '__coverage_instrumented__/src/alias.ts'),
    (row: Record<string, unknown>) => (row.artifact_path = '__coverage_instrumented__/src/./host-state.ts'),
    (row: Record<string, unknown>) => (row.artifact_path = '__coverage_instrumented__/src/../src/host-state.ts'),
  ]) {
    await withFixture(async (fixture) => {
      mutate(instrumentedRows(fixture)[0]!);
      await rejects(fixture, manifestBytes(fixture), /instrumented-source|instrumented artifact/u);
    });
  }
});

test('rejects missing, truncated, tampered, and symlinked v2 instrumented artifacts', async () => {
  for (const mode of ['missing', 'truncated', 'tampered', 'symlink'] as const) {
    await withFixture(async (fixture) => {
      const target = artifactPath(fixture, instrumentedRows(fixture)[0]!);
      if (mode === 'missing') {
        rmSync(target);
      } else if (mode === 'symlink') {
        const outside = path.join(fixture.root, 'outside-instrumented.ts');
        writeFileSync(outside, 'export const outside = true;\n');
        rmSync(target);
        symlinkSync(outside, target);
      } else {
        const bytes = readFileSync(target);
        writeFileSync(
          target,
          mode === 'truncated'
            ? bytes.subarray(0, Math.max(0, bytes.length - 1))
            : Buffer.concat([bytes, Buffer.from('\n/* tampered */')]),
        );
      }
      await rejects(fixture, fixture.reportBytes(), /instrumented artifact/u);
    });
  }
});

test('rejects cross-swapped instrumented artifacts even when row and manifest hashes are rebound', async () => {
  await withFixture(async (fixture) => {
    const rows = instrumentedRows(fixture);
    const first = artifactPath(fixture, rows[0]!);
    const second = artifactPath(fixture, rows[1]!);
    const firstBytes = readFileSync(first);
    const secondBytes = readFileSync(second);
    writeFileSync(first, secondBytes);
    writeFileSync(second, firstBytes);
    rows[0]!.artifact_sha256 = sha256(secondBytes);
    rows[1]!.artifact_sha256 = sha256(firstBytes);
    await rejects(fixture, manifestBytes(fixture), /instrumented artifact differs from canonical instrumentation/u);
  });
});

test('rejects coherently rewritten v2 artifact bytes against canonical Source transformation', async () => {
  await withFixture(async (fixture) => {
    const row = instrumentedRows(fixture)[0]!;
    const target = artifactPath(fixture, row);
    const rewritten = Buffer.from('export const attackerControlled = true;\n');
    writeFileSync(target, rewritten);
    row.artifact_sha256 = sha256(rewritten);
    await rejects(fixture, manifestBytes(fixture), /instrumented artifact differs from canonical instrumentation/u);
  });
});

test('accepts explicit v1 synthetic map-only reader compatibility as untrusted data', async () => {
  const fixture = await createSyntheticCoverageFixture({ legacyManifest: true });
  let passed = false;
  try {
    const result = await validateCoverageReport(fixture.reportPath, fixture.root, {
      reportBytes: fixture.reportBytes(),
      requireFullCoverage: false,
    });
    expect(result.manifest.schema).toBe('VidaBunCoverageRun/v1');
    expect(result).toHaveProperty('canonical_source_maps', expect.any(Object));
    passed = true;
  } finally {
    if (passed) fixture.remove();
    else console.error(`Preserved failed synthetic legacy coverage fixture at ${fixture.root}`);
  }
});

test('rejects instrumented artifact metadata declared under a v1 manifest', async () => {
  await withFixture(async (fixture) => {
    fixture.manifest.schema = 'VidaBunCoverageRun/v1';
    await rejects(fixture, manifestBytes(fixture), /instrumented-source metadata requires a v2 manifest/u);
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
