import { expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { runCompletedReadOnlyCapture } from '../bin/capture-completed-readonly.ts';
import { preparedFixture } from './helpers/documentation-policy-fixture.ts';
import { rejectionReason } from './helpers/expect-rejection.ts';

test('completed readonly capture denies unadmitted source before observation or owner effects', async () => {
  const { f, baseline } = await preparedFixture();
  const database = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
  const before = readFileSync(database);
  const baselineBefore = readFileSync(path.join(f.root, baseline.path));
  const operationId = 'unapproved-capture';
  const admissionIntent = path.join(f.root, '.agent/cutover', operationId, 'forward-intent.v1.json');
  mkdirSync(path.dirname(admissionIntent), { recursive: true });
  expect(existsSync(admissionIntent)).toBe(false);
  const requestPath = '.agent/work/unapproved-capture/request.json';
  const reportPath = path.join(f.root, '.agent/work/unapproved-capture/report.json');
  expect(existsSync(reportPath)).toBe(false);
  f.put(
    requestPath,
    f.json({
      work_id: f.work,
      project_ids: ['fixture-project'],
      attempt: 1,
      native_session_handle: 'fixture-session',
      user_request_pointer: 'TEST SETUP: authorized policy addition',
      expected_work: { revision: 1, digest: 'a'.repeat(64) },
      expected_ledger: { revision: 1, digest: 'b'.repeat(64) },
      expected_journal: { revision: 1, digest: 'c'.repeat(64) },
      reports: ['.agent/work/unapproved-capture/report.json'],
    }),
  );
  const phases: string[] = [];
  const failure: unknown = await rejectionReason(
    runCompletedReadOnlyCapture(
      {
        root: f.root,
        payloadRoot: path.dirname(f.bundle),
        operationId,
        requestPath,
      },
      { onPhase: (phase) => phases.push(phase) },
    ),
  );
  expect(failure).toMatchObject({ code: 'ENOENT', path: admissionIntent });
  expect(phases).toEqual([]);
  expect(existsSync(reportPath)).toBe(false);
  expect(readFileSync(database).equals(before)).toBe(true);
  expect(readFileSync(path.join(f.root, baseline.path)).equals(baselineBefore)).toBe(true);
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
}, 30000);

test('completed readonly capture rejects an invalid active selector before reading its request', async () => {
  const { f } = await preparedFixture();
  const database = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
  const before = readFileSync(database);
  f.put(
    '.agent/active-runtime-selector.v1.json',
    f.json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: '../outside-selected-generation',
      payload_manifest_sha256: '1'.repeat(64),
    }),
  );
  const phases: string[] = [];
  const failure: unknown = await rejectionReason(
    runCompletedReadOnlyCapture(
      {
        root: f.root,
        payloadRoot: f.bundle,
        operationId: 'selector-boundary',
        requestPath: '.agent/work/missing-capture-request.json',
      },
      { onPhase: (phase) => phases.push(phase) },
    ),
  );
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain('selected generation invalid');
  expect(phases).toEqual([]);
  expect(readFileSync(database).equals(before)).toBe(true);
}, 30000);
