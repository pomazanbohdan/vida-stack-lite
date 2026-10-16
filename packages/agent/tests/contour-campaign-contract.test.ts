import { expect, test } from 'bun:test';
import {
  campaignOptions,
  campaignPartition,
  campaignProcessState,
  executeContourCampaign,
  type CampaignOutcome,
} from '../tooling/contour-campaign.ts';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';
import type { MutationPartition } from '../tooling/mutation-partitions.ts';
import { mutationPartitions } from '../tooling/mutation-partitions.ts';
import { selectContourCampaign } from '../tooling/contour-progress.ts';

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
    expect(calls).toHaveLength(6);
    expect(recorded).toHaveLength(6);
    expect(result.steps[0]?.outcome.state).toBe(state);
  }
});

test('UNKNOWN process custody records the outcome and fences every successor', async () => {
  const calls: string[] = [];
  const recorded: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      calls.push(`${partition.name}:${lane}`);
      return fail('unknown');
    },
    ({ contour, lane, outcome }) => recorded.push(`${contour}:${lane}:${outcome.state}`),
  );
  expect(result.complete).toBe(false);
  expect(calls).toEqual(['lane-a:coverage']);
  expect(recorded).toEqual(['lane-a:coverage:unknown']);
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
  expect(campaignProcessState(processResult({ exitCode: 1 }))).toBe('failed');
  expect(campaignProcessState(processResult({ processCustody: null }))).toBe('unknown');
  expect(
    campaignProcessState(
      processResult({ processCustody: { ...processResult().processCustody!, processGroupTerminationObserved: false } }),
    ),
  ).toBe('unknown');
});
