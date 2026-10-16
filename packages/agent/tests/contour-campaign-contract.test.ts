import { expect, test } from 'bun:test';
import {
  campaignOptions,
  campaignPartition,
  campaignProcessState,
  campaignScratchDirectory,
  campaignStorageAdmitted,
  executeContourCampaign,
  isolatedCommand,
  throwAfterCampaignReceiptFailure,
  type CampaignOutcome,
} from '../tooling/contour-campaign.ts';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';
import type { MutationPartition } from '../tooling/mutation-partitions.ts';
import { mutationPartitions } from '../tooling/mutation-partitions.ts';
import { selectContourCampaign } from '../tooling/contour-progress.ts';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statfsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('campaign retains private scratch with its stage instead of accumulating host tmpfs roots', () => {
  const parent = path.resolve('.tmp');
  mkdirSync(parent, { recursive: true });
  const stage = mkdtempSync(path.join(parent, 'contour-scratch-control-'));
  let completed = false;
  try {
    const isolated = isolatedCommand(stage, ['tooling/contour-campaign.ts', '--coverage-child', 'main-config'], {
      tini: '/control/tini',
      bwrap: '/control/bwrap',
    });
    expect(path.dirname(isolated.temporary)).toBe(stage);
    const scratch = path.join(isolated.temporary, 'scratch');
    const installCache = path.join(scratch, 'bun-install-cache');
    expect(isolated.command).toContain(scratch);
    expect(isolated.environment).toEqual({
      TMPDIR: '/tmp',
      BUN_TMPDIR: '/tmp',
      BUN_INSTALL_CACHE_DIR: '/tmp/bun-install-cache',
    });
    const cacheSentinel = path.join(installCache, 'writable-sentinel');
    writeFileSync(cacheSentinel, 'private writable cache');
    expect(readFileSync(cacheSentinel, 'utf8')).toBe('private writable cache');
    const index = isolated.command.indexOf(scratch);
    expect(isolated.command.slice(index - 1, index + 2)).toEqual(['--bind', scratch, '/tmp']);
    const filesystem = statfsSync(scratch, { bigint: true });
    expect(isolated.scratch_storage.filesystem_type).toBe(String(filesystem.type));
    expect(BigInt(isolated.scratch_storage.available_bytes)).toBeGreaterThanOrEqual(2n * 1024n ** 3n);
    expect(isolated.scratch_storage.minimum_free_bytes).toBe(String(2n * 1024n ** 3n));
    const retained = path.join(scratch, 'unknown-receipt.json');
    const bytes = '{"status":"UNKNOWN","scope":"test-fixture-only"}\n';
    writeFileSync(retained, bytes, { flag: 'wx' });
    expect(readFileSync(retained, 'utf8')).toBe(bytes);
    completed = true;
  } finally {
    if (completed) rmSync(stage, { recursive: true });
  }
});

test('campaign private scratch stays outside the copied package root', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scratchRoot = campaignScratchDirectory('fixture-run', '001-lane-coverage');
  const relative = path.relative(packageRoot, scratchRoot);
  expect(relative.startsWith('..' + path.sep)).toBe(true);
});

test('campaign reports resource receipt failures and preserves both causes', () => {
  const primary = new Error('terminal publication failed');
  const receipt = Object.assign(new Error('disk full writing interruption receipt'), { code: 'ENOSPC' });
  const diagnostics: string[] = [];
  let observed: unknown;
  try {
    throwAfterCampaignReceiptFailure(primary, receipt, { source_commit: 'fixture-commit' }, (line) => {
      diagnostics.push(line);
    });
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(AggregateError);
  if (!(observed instanceof AggregateError)) throw new Error('Expected retained campaign and receipt failures');
  expect(observed.errors).toEqual([primary, receipt]);
  expect(JSON.parse(diagnostics[0]!)).toEqual({
    schema: 'VidaContourCampaignOutcome/v1',
    status: 'resource-incomplete',
    source_commit: 'fixture-commit',
    error: String(primary),
    receipt_error: String(receipt),
  });
});

test('campaign preserves thrown undefined when receipt and diagnostic reporting fail', () => {
  const receipt = new Error('receipt unavailable');
  const diagnostic = new Error('inherited stderr unavailable');
  let observed: unknown;
  try {
    throwAfterCampaignReceiptFailure(undefined, receipt, { source_commit: 'fixture-commit' }, () => {
      throw diagnostic;
    });
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(AggregateError);
  if (!(observed instanceof AggregateError)) throw new Error('Expected all three retained failures');
  expect(observed.errors).toEqual([undefined, receipt, diagnostic]);
});

test('campaign storage admission preserves the two GiB boundary', () => {
  const minimum = 2n * 1024n ** 3n;
  expect(campaignStorageAdmitted(minimum - 1n)).toBe(false);
  expect(campaignStorageAdmitted(minimum)).toBe(true);
  expect(campaignStorageAdmitted(minimum + 1n)).toBe(true);
});

const contours: MutationPartition[] = [
  { name: 'lane-a', sources: ['src/a.ts'], tests: ['tests/a.test.ts'] },
  { name: 'lane-b', sources: ['src/b.ts'], tests: ['tests/b.test.ts'] },
];
const completed: CampaignOutcome = { state: 'completed', detail: 'fixture completed' };
const fail = (state: CampaignOutcome['state']): CampaignOutcome => ({ state, detail: `fixture ${state}` });

test('campaign options require exactly one strict selection and reject malformed flags', () => {
  expect(campaignOptions(['--all'])).toEqual({ mode: 'all', plan: false });
  expect(campaignOptions(['--unclosed', '--plan'])).toEqual({ mode: 'unclosed', plan: true });
  for (const args of [[], ['--all', '--unclosed'], ['--all', '--all'], ['--all', '--wat'], ['--plan']]) {
    expect(() => campaignOptions(args)).toThrow();
  }
});

test('campaign selection normalizes every active executable registry Source and preserves full test sets', () => {
  const registry = mutationPartitions();
  const selected = selectContourCampaign({ schema: 'VidaContourProgress/v1', attempts: [] }, 'all', 'fixture-commit');
  expect(selected.map((partition) => partition.name)).toEqual(
    registry.filter((partition) => partition.environment !== 'static').map((partition) => partition.name),
  );
  for (const partition of selected) {
    const normalized = campaignPartition(partition);
    expect(normalized.sources).toEqual(
      partition.sources ?? (partition.requiredReportedSource ? [partition.requiredReportedSource] : []),
    );
    expect(normalized.tests).toEqual(partition.tests);
    expect(normalized.sources?.length).toBeGreaterThan(0);
    expect(normalized.tests?.length).toBeGreaterThan(0);
  }
  const linux = campaignPartition(selected.find((partition) => partition.name === 'linux')!);
  expect(linux.sources).toEqual(['src/config/safe-repository-access.ts']);
  expect(linux.tests).toEqual(registry.find((partition) => partition.name === 'linux')?.tests);
});

test('every contour completes coverage and frozen CRAP before any mutation begins', async () => {
  const events: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      events.push(`${partition.name}:${lane}`);
      return completed;
    },
    ({ contour, lane }) => events.push(`record:${contour}:${lane}`),
  );
  expect(result.complete).toBe(true);
  expect(events.filter((entry) => !entry.startsWith('record:'))).toEqual([
    'lane-a:coverage',
    'lane-a:frozen-crap',
    'lane-b:coverage',
    'lane-b:frozen-crap',
    'lane-a:mutation',
    'lane-b:mutation',
  ]);
  expect(result.steps).toHaveLength(6);
});

test('settled known failures, gaps and timeouts preserve remaining independent lanes', async () => {
  for (const state of ['failed', 'gap', 'timeout'] as const) {
    const calls: string[] = [];
    const recorded: string[] = [];
    const result = await executeContourCampaign(
      contours,
      async (partition, lane) => {
        calls.push(`${partition.name}:${lane}`);
        return partition.name === 'lane-a' && lane === 'coverage' ? fail(state) : completed;
      },
      ({ contour, lane }) => recorded.push(`${contour}:${lane}`),
    );
    expect(result.complete).toBe(true);
    expect(calls).toEqual([
      'lane-a:coverage',
      'lane-b:coverage',
      'lane-b:frozen-crap',
      'lane-a:mutation',
      'lane-b:mutation',
    ]);
    expect(recorded).toHaveLength(6);
    expect(result.steps[0]?.outcome.state).toBe(state);
    expect(result.steps[1]?.outcome).toEqual({
      state: 'gap',
      detail: 'Same-campaign coverage did not complete at exact maximum; no CRAP producer launched.',
    });
  }
});

test.each(['unknown', 'resource'] as const)('%s records the outcome and fences every successor', async (state) => {
  const calls: string[] = [];
  const recorded: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      calls.push(`${partition.name}:${lane}`);
      return fail(state);
    },
    ({ contour, lane, outcome }) => recorded.push(`${contour}:${lane}:${outcome.state}`),
  );
  expect(result.complete).toBe(false);
  expect(calls).toEqual(['lane-a:coverage']);
  expect(recorded).toEqual([`lane-a:coverage:${state}`]);
  expect(result.steps).toHaveLength(1);
});

function processResult(overrides: Partial<MutationProcessResult> = {}): MutationProcessResult {
  return {
    exitCode: 0,
    signal: null,
    spawnError: null,
    timedOut: false,
    processCustody: {
      pid: 42,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    output_capture: {
      complete: true,
      stdout: { bytes: 0, sha256: 'a'.repeat(64), retained_bytes: 0, truncated: false },
      stderr: { bytes: 0, sha256: 'b'.repeat(64), retained_bytes: 0, truncated: false },
    },
    ...overrides,
  };
}

test('process timeout, output gap and raw mutation evidence stay distinct from custody', () => {
  expect(campaignProcessState(processResult())).toBe('completed');
  expect(campaignProcessState(processResult({ timedOut: true }))).toBe('timeout');
  expect(campaignProcessState(processResult({ output_capture: { complete: false } }))).toBe('failed');
  for (const stream of ['stdout', 'stderr'] as const) {
    const result = processResult();
    const capture = result.output_capture;
    if (!capture?.complete) throw new Error('Fixture requires complete capture.');
    capture[stream].truncated = true;
    expect(campaignProcessState(result)).toBe('failed');
  }
  expect(campaignProcessState(processResult({ exitCode: 1 }))).toBe('failed');
  expect(campaignProcessState(processResult({ processCustody: null }))).toBe('unknown');
  expect(
    campaignProcessState(
      processResult({ processCustody: { ...processResult().processCustody!, terminationObserved: false } }),
    ),
  ).toBe('unknown');
  expect(
    campaignProcessState(
      processResult({ processCustody: { ...processResult().processCustody!, processGroupTerminationObserved: false } }),
    ),
  ).toBe('unknown');
});
