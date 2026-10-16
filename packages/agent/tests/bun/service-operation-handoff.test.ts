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
import { expectAsyncReturned, expectRejection, expectReturned } from '../helpers/expect-rejection.js';
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
    let verifierCalls = 0;
    const result = await expectAsyncReturned(() =>
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async (observed) => {
          verifierCalls++;
          expect(observed).toEqual(prior);
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
    );
    expect(verifierCalls).toBe(1);
    expect(() => source.query('SELECT 1').get()).toThrow();
    expectHandoffLineage(result, prior);
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    try {
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(result);
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

const invalidPersistedHandoffCases = [
  ['handoff digest', 'handoff_digest', 'invalid'],
  ['predecessor request digest', 'handoff_from_request_digest', 'invalid'],
  ['predecessor evidence digest', 'handoff_from_evidence_digest', 'invalid'],
  ['predecessor phase', 'handoff_from_phase', 'prepared'],
  ['zero predecessor revision', 'handoff_from_revision', 0],
] as const;

for (const [label, column, value] of invalidPersistedHandoffCases) {
  test(`reader rejects a persisted ${label} that breaks handoff lineage`, async () => {
    const fixture = openCustodyFixture('handoff-invalid-lineage-');
    let database: ReturnType<typeof openServiceOperationDatabase> | undefined;
    try {
      finishOperation(fixture, 'release-pack-worker');
      const source = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
      await expectAsyncReturned(() =>
        handoffServiceOperationCustody(
          source,
          fixture.root,
          fixture.relative,
          fixture.workspaceId,
          operationId,
          requestDigest,
          retargetDigest,
          preparedReceipt,
        ),
      );
      database = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
      database
        .query(`UPDATE agent_host_service_operation_custody SET ${column}=? WHERE workspace_id=? AND operation_id=?`)
        .run(value, fixture.workspaceId, operationId);
      expect(() => readServiceOperationCustodyForOperation(database!, fixture.workspaceId, operationId)).toThrow(
        'Service operation custody: stored operation handoff is invalid',
      );
    } finally {
      if (database) closeServiceOperationDatabase(database);
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
}

test('handoff rolls back when an AFTER UPDATE trigger deletes its CAS row', async () => {
  const fixture = openCustodyFixture('handoff-missing-afterimage-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const setup = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    setup.exec(
      'CREATE TRIGGER remove_handoff_custody AFTER UPDATE OF owner_kind ON agent_host_service_operation_custody ' +
        "WHEN NEW.owner_kind='release-worker' BEGIN DELETE FROM agent_host_service_operation_custody " +
        'WHERE workspace_id=NEW.workspace_id AND operation_id=NEW.operation_id; END',
    );
    closeServiceOperationDatabase(setup);
    const source = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    await expectRejection(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        preparedReceipt,
      ),
      'same-operation handoff compare-and-swap failed',
    );
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    try {
      expect(readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)).toEqual(prior);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
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
  const terminal = expectReturned(() =>
    readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
  );
  closeServiceOperationCustodyHandle(handle);
  if (!terminal) throw new Error('Terminal operation custody row disappeared.');
  return terminal;
}

function expectHandoffLineage(
  result: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
  prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
): void {
  expect(result).not.toBeNull();
  expect(typeof result).toBe('object');
  expect(prior).not.toBeNull();
  expect(typeof prior).toBe('object');
  expect(typeof result.workspace_id).toBe('string');
  expect(typeof result.owner_kind).toBe('string');
  expect(typeof result.operation_id).toBe('string');
  expect(typeof result.request_digest).toBe('string');
  expect(typeof result.revision).toBe('number');
  expect(typeof result.phase).toBe('string');
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
    let verifierCalls = 0;
    const verifier: HandoffVerifier = async (observed) => {
      verifierCalls++;
      expect(observed).toEqual(prior);
      return preparedReceipt(observed);
    };
    expect(await expectHandoffFailure(fixture, prior, verifier, expected, priorRequest)).toEqual(prior);
    expect(verifierCalls).toBe(0);
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
    const prepared = await expectAsyncReturned(() =>
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        async () => ({ phase: 'prepared', evidence_digest: evidenceDigest }),
      ),
    );
    expect(prepared.phase).toBe('prepared');
    let verifierCalls = 0;
    const verifier: HandoffVerifier = async () => {
      verifierCalls++;
      return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
    };
    expect(await expectHandoffFailure(fixture, prepared, verifier, /only the exact terminal pack owner/u)).toEqual(
      prepared,
    );
    expect(verifierCalls).toBe(0);
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
    return expectReturned(() =>
      readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, prior.operation_id),
    );
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
