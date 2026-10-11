import { expect, test } from 'bun:test';
import { copyFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  closeServiceOperationCustody,
  closeServiceOperationCustodyHandle,
  closeServiceOperationDatabase,
  handoffServiceOperationCustody,
  openServiceOperationDatabase,
  readServiceOperationCustodyForOperation,
  recordServiceOperationLaunchPid,
  reserveServiceOperationLaunch,
  reconcileServiceOperationCustody,
  claimReservedServiceOperationLaunch,
} from '../../src/config/service-operation-custody.js';
import { expectRejection } from '../helpers/expect-rejection.js';
import { openCustodyFixture, type ServiceCustodyFixture } from '../helpers/service-custody-fixture.js';

const requestDigest = 'b'.repeat(64);
const retargetDigest = 'd'.repeat(64);
const evidenceDigest = 'e'.repeat(64);
const terminalDigest = 'f'.repeat(64);
const handoffDigest = '9'.repeat(64);
const operationId = 'handoff-operation';
const launchPid = 7312;
type HandoffVerifier = Parameters<typeof handoffServiceOperationCustody>[7];

test('terminal pack custody transfers to one prepared release image with exact lineage and no owner token', async () => {
  const fixture = openCustodyFixture('handoff-positive-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const source = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    const result = await handoffServiceOperationCustody(
      source,
      fixture.root,
      fixture.relative,
      fixture.workspaceId,
      operationId,
      requestDigest,
      retargetDigest,
      async (observed) => {
        expect(observed).toEqual(prior);
        return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
      },
    );
    expect(() => source.query('SELECT 1').get()).toThrow();
    expectHandoffLineage(result, prior);
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    try {
      expect(readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)).toEqual(result);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('handoff rejects a release owner, a different prior request, and a nonterminal pack row without mutation', async () => {
  await assertRejectedLineage(
    'handoff-wrong-owner-',
    'release-worker',
    requestDigest,
    /only the exact terminal pack owner/u,
  );
  await assertRejectedLineage(
    'handoff-wrong-request-',
    'release-pack-worker',
    'c'.repeat(64),
    /only the exact terminal pack owner/u,
  );
  await assertPreparedPackCannotHandoff();
});

test('verifier rejection and malformed prepared receipt preserve the terminal pack row', async () => {
  const fixture = openCustodyFixture('handoff-verifier-failure-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const verifierFailure = async (): Promise<never> => {
      throw new Error('retarget receipt unavailable');
    };
    const afterVerifierFailure = await expectHandoffFailure(
      fixture,
      prior,
      verifierFailure,
      'retarget receipt unavailable',
    );
    expect(afterVerifierFailure).toEqual(prior);
    const malformedReceipt: HandoffVerifier = async () => ({
      phase: 'prepared',
      evidence_digest: 'invalid',
      handoff_digest: handoffDigest,
    });
    const afterMalformedReceipt = await expectHandoffFailure(
      fixture,
      prior,
      malformedReceipt,
      /handoff install image digest is invalid/u,
    );
    expect(afterMalformedReceipt).toEqual(prior);
    const wrongPhaseReceipt = (async () => ({
      phase: 'terminal',
      evidence_digest: evidenceDigest,
      handoff_digest: handoffDigest,
    })) as unknown as HandoffVerifier;
    const afterWrongPhaseReceipt = await expectHandoffFailure(
      fixture,
      prior,
      wrongPhaseReceipt,
      /handoff receipt is not a prepared install image/u,
    );
    expect(afterWrongPhaseReceipt).toEqual(prior);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('gate replacement during an awaited receipt leaves the original terminal row intact', async () => {
  const fixture = openCustodyFixture('handoff-replaced-gate-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const afterReplacement = await expectHandoffFailure(
      fixture,
      prior,
      async () => {
        await Promise.resolve();
        replaceAdmissionGate(fixture);
        return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
      },
      /gate file or parent was replaced/u,
    );
    expect(afterReplacement).toEqual(prior);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

function finishOperation(fixture: ServiceCustodyFixture, kind: 'release-pack-worker' | 'release-worker') {
  const reservation = reserveServiceOperationLaunch(
    fixture.database,
    fixture.workspaceId,
    kind,
    operationId,
    requestDigest,
    evidenceDigest,
  );
  recordServiceOperationLaunchPid(
    fixture.database,
    fixture.workspaceId,
    kind,
    operationId,
    requestDigest,
    reservation.revision,
    launchPid,
    reservation.child_capability,
  );
  const handle = claimReservedServiceOperationLaunch(
    fixture.database,
    fixture.workspaceId,
    kind,
    operationId,
    requestDigest,
    launchPid,
    reservation.child_capability,
  );
  closeServiceOperationCustody(handle, 'terminal', terminalDigest);
  const terminal = readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId);
  closeServiceOperationCustodyHandle(handle);
  if (!terminal) throw new Error('Terminal operation custody row disappeared.');
  return terminal;
}

function expectHandoffLineage(
  result: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
  prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
): void {
  expect(result.owner_kind).toBe('release-worker');
  expect(result.operation_id).toBe(prior.operation_id);
  expect(result.request_digest).toBe(retargetDigest);
  expect(result.owner_token).toBeNull();
  expect(result.revision).toBe(prior.revision + 1);
  expect(result.phase).toBe('prepared');
  expect(result.evidence_digest).toBe(evidenceDigest);
  expect(result.handoff_digest).toBe(handoffDigest);
  expect(result.handoff_from_kind).toBe('release-pack-worker');
  expect(result.handoff_from_phase).toBe('terminal');
  expect(result.handoff_from_request_digest).toBe(prior.request_digest);
  expect(result.handoff_from_revision).toBe(prior.revision);
  expect(result.handoff_from_evidence_digest).toBe(prior.evidence_digest);
}

async function assertRejectedLineage(
  prefix: string,
  kind: 'release-pack-worker' | 'release-worker',
  priorRequest: string,
  expected: string | RegExp,
): Promise<void> {
  const fixture = openCustodyFixture(prefix);
  try {
    const prior = finishOperation(fixture, kind);
    expect(await expectHandoffFailure(fixture, prior, preparedReceipt, expected, priorRequest)).toEqual(prior);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function assertPreparedPackCannotHandoff(): Promise<void> {
  const fixture = openCustodyFixture('handoff-nonterminal-');
  try {
    reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      evidenceDigest,
    );
    const prepared = await reconcileServiceOperationCustody(
      fixture.database,
      fixture.root,
      fixture.relative,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      async () => ({ phase: 'prepared', evidence_digest: evidenceDigest }),
    );
    expect(prepared.phase).toBe('prepared');
    expect(
      await expectHandoffFailure(fixture, prepared, preparedReceipt, /only the exact terminal pack owner/u),
    ).toEqual(prepared);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function expectHandoffFailure(
  fixture: ServiceCustodyFixture,
  prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
  verifier: HandoffVerifier,
  message: string | RegExp,
  priorRequest = requestDigest,
) {
  const source = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
  await expectRejection(
    handoffServiceOperationCustody(
      source,
      fixture.root,
      fixture.relative,
      fixture.workspaceId,
      operationId,
      priorRequest,
      retargetDigest,
      verifier,
    ),
    message,
  );
  const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
  try {
    return readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, prior.operation_id);
  } finally {
    closeServiceOperationDatabase(reopened);
  }
}

const preparedReceipt: HandoffVerifier = async () => ({
  phase: 'prepared',
  evidence_digest: evidenceDigest,
  handoff_digest: handoffDigest,
});

function replaceAdmissionGate(fixture: ServiceCustodyFixture): void {
  const gate = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
  renameSync(gate, gate + '.retained');
  copyFileSync(gate + '.retained', gate);
}
