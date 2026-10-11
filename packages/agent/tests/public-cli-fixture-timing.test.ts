import { expect, spyOn, test } from 'bun:test';
import { mkdtempSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as fixtureTiming from './helpers/public-cli-fixture-runner.ts';

test('parent phase receipts distinguish completed intervals from the last started phase', () => {
  expect(fixtureTiming).toHaveProperty('createPublicCliFixturePhaseMarker');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-parent-timing-'));
  const clock = spyOn(process.hrtime, 'bigint');
  try {
    clock
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_012_500_000n)
      .mockReturnValueOnce(1_018_000_000n);
    const receipt = path.join(root, 'private', 'timing.ndjson');
    const mark = fixtureTiming.createPublicCliFixturePhaseMarker(receipt);
    mark('fixture_setup');
    mark('workflow_setup');
    mark('public_issue_wave');
    const records: unknown = readFileSync(receipt, 'utf8')
      .trim()
      .split('\n')
      .map((line): unknown => {
        const record: unknown = JSON.parse(line);
        return record;
      });
    expect(records).toEqual([
      { schema: 'PrivatePublicCliFixturePhaseTiming/v1', phase: 'fixture_setup', elapsed_ms: 0, since_previous_ms: 0 },
      {
        schema: 'PrivatePublicCliFixturePhaseTiming/v1',
        phase: 'workflow_setup',
        elapsed_ms: 12.5,
        since_previous_ms: 12.5,
      },
      {
        schema: 'PrivatePublicCliFixturePhaseTiming/v1',
        phase: 'public_issue_wave',
        elapsed_ms: 18,
        since_previous_ms: 5.5,
      },
    ]);
  } finally {
    clock.mockRestore();
    rmSync(root, { recursive: true, force: true });
  }
});

test('parent phase receipt write failure is visible without a fabricated completion', () => {
  expect(fixtureTiming).toHaveProperty('createPublicCliFixturePhaseMarker');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-parent-timing-'));
  try {
    const receipt = path.join(root, 'timing.ndjson');
    const mark = fixtureTiming.createPublicCliFixturePhaseMarker(receipt);
    mkdirSync(receipt);
    expect(() => mark('fixture_setup')).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
