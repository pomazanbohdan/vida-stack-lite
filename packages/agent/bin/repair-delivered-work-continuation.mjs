#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import path from 'node:path';
import { canonicalJson, canonicalJsonDigest, rfc3339TimestampMilliseconds } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import {
  projectConfiguredFrontierContinuationAction,
  validateDeliveredWorkContinuationRequest,
} from '../src/orchestration/delivered-work-continuation.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const required = (condition, message) => {
  if (!condition) throw new Error(`vida repair delivered-work-continuation: ${message}`);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const exactKeys = (value, keys) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const same = (a, b) => canonicalJsonDigest(a) === canonicalJsonDigest(b);

/**
 * Isolated future-v1 validator. It grants no ordinary-reader compatibility and no repair effect.
 * Snapshot bytes are retained as immutable evidence and bound to the exact suspended frontier.
 */
export function validateConfiguredFrontierRepairReceipt(input) {
  const receipt = input?.receipt;
  required(
    receipt && Buffer.byteLength(JSON.stringify(receipt), 'utf8') <= 64 * 1024 * 1024 &&
      Array.isArray(receipt.prior_journal?.completed) && Array.isArray(receipt.prior_journal?.items) &&
      Array.isArray(receipt.successor_journal?.completed) && Array.isArray(receipt.successor_journal?.items),
    'future configured-frontier receipt exceeds bounds or lacks journal arrays',
  );
  required(
    exactKeys(receipt, [
      'schema', 'continuation_id', 'attempt', 'request_digest', 'authorization', 'request', 'prior_work', 'prior_ledger',
      'prior_journal', 'prior_work_version', 'prior_ledger_version', 'prior_journal_version', 'historical_capture',
      'frontier_snapshot', 'successor_work', 'successor_ledger', 'successor_binding', 'successor_journal',
      'work_version', 'ledger_version', 'journal_version', 'rights_granted', 'accepted_result', 'runtime_acceptance', 'status',
    ]) && receipt?.schema === 'DeliveredWorkContinuationReceipt/v1' &&
      receipt.status === 'action_ready' &&
      receipt.rights_granted === false && receipt.accepted_result === false && receipt.runtime_acceptance === false &&
      receipt.historical_capture === null &&
      exactKeys(receipt.frontier_snapshot, ['snapshot_bytes_base64', 'snapshot_sha256']) &&
      typeof receipt.frontier_snapshot.snapshot_bytes_base64 === 'string' &&
      receipt.frontier_snapshot.snapshot_bytes_base64.length <= 8 * 1024 * 1024 &&
      digestPattern.test(receipt.frontier_snapshot.snapshot_sha256),
    'future configured-frontier receipt or immutable snapshot is malformed',
  );
  const request = validateDeliveredWorkContinuationRequest(receipt.request),
    action = request.action;
  required(action.kind === 'configured_frontier', 'repair-only frontier validator received a historical action');
  required(
    exactKeys(receipt.authorization, ['schema', 'request_digest', 'principal', 'transition_digest', 'action_digest']) &&
      receipt.authorization.schema === 'VidaDeliveredWorkContinuationAuthorization/v1' &&
      typeof receipt.authorization.principal === 'string' && receipt.authorization.principal.trim().length > 0 &&
      receipt.authorization.principal === receipt.authorization.principal.trim() &&
      !/\p{Cc}/u.test(receipt.authorization.principal) &&
      receipt.authorization.request_digest === canonicalJsonDigest(request) &&
      receipt.authorization.transition_digest === request.sourceTransition.transition_digest &&
      receipt.authorization.action_digest === canonicalJsonDigest(action) &&
      receipt.request_digest === canonicalJsonDigest(request) &&
      receipt.attempt === request.attempt &&
      receipt.continuation_id === canonicalJsonDigest({
        identity: request.identity,
        attempt: request.attempt,
        action_id: action.request.action_id,
        transition_digest: request.sourceTransition.transition_digest,
      }),
    'future configured-frontier authorization or continuation identity differs',
  );
  const bytes = Buffer.from(receipt.frontier_snapshot.snapshot_bytes_base64, 'base64');
  required(
    bytes.toString('base64') === receipt.frontier_snapshot.snapshot_bytes_base64 &&
      sha256(bytes) === receipt.frontier_snapshot.snapshot_sha256,
    'future configured-frontier snapshot bytes or checksum differs',
  );
  const snapshot = JSON.parse(bytes.toString('utf8'));
  required(
    snapshot !== null && typeof snapshot === 'object' && !Array.isArray(snapshot) &&
      Buffer.from(canonicalJson(snapshot)).equals(bytes),
    'future configured-frontier engine snapshot is not canonical JSON',
  );
  const projected = projectConfiguredFrontierContinuationAction({
      engine: snapshot,
      journal: receipt.prior_journal,
      targetConfigDigest: request.targetConfigDigest,
      currentSourceScope: request.currentSourceScope,
    }),
    completedObservations = receipt.prior_journal.completed.flatMap((wave) => wave.items.map((item) => item.observation));
  required(
    Buffer.from(canonicalJson(snapshot)).equals(bytes) &&
      canonicalJsonDigest(snapshot) === action.engine_snapshot_digest && same(projected, action) &&
      same(snapshot.observations, completedObservations) &&
      receipt.prior_work_version.revision === request.expectedWork.revision &&
      receipt.prior_work_version.digest === request.expectedWork.digest &&
      receipt.prior_ledger_version.revision === request.expectedLedger.revision &&
      receipt.prior_ledger_version.digest === request.expectedLedger.digest &&
      receipt.prior_journal_version.revision === receipt.request.expectedJournal.revision &&
      receipt.prior_journal_version.digest === request.expectedJournal.digest &&
      receipt.prior_work.revision === receipt.prior_work_version.revision &&
      canonicalJsonDigest(receipt.prior_work) === receipt.prior_work_version.digest &&
      receipt.prior_ledger.revision === receipt.prior_ledger_version.revision &&
      canonicalJsonDigest(receipt.prior_ledger) === receipt.prior_ledger_version.digest &&
      canonicalJsonDigest(receipt.prior_journal) === receipt.prior_journal_version.digest &&
      receipt.prior_journal.workspace_id === request.sourceTransition.transition.fence.workspace_id &&
      receipt.prior_journal.work_id === request.identity.work_id &&
      receipt.prior_journal.attempt === receipt.attempt &&
      receipt.prior_journal.run_id === action.run_id &&
      receipt.successor_journal.workspace_id === receipt.prior_journal.workspace_id &&
      receipt.successor_journal.work_id === receipt.prior_journal.work_id &&
      receipt.successor_journal.attempt === receipt.prior_journal.attempt &&
      receipt.successor_journal.run_id === action.run_id &&
      receipt.successor_journal.completed.length === receipt.prior_journal.completed.length &&
      same(receipt.successor_journal.completed, receipt.prior_journal.completed) &&
      receipt.successor_journal.items.length === 1 &&
      same(receipt.successor_journal.items[0].request, action.request) &&
      receipt.successor_journal.items[0].issue_id === null &&
      receipt.successor_journal.items[0].observation === null &&
      receipt.successor_journal.corrective_execution == null &&
      receipt.successor_journal.research_wave_exposure === undefined &&
      receipt.successor_journal.items[0].host_reservation === undefined &&
      receipt.successor_journal.items[0].research_activation === undefined &&
      receipt.successor_journal.items[0].research_normalization === undefined &&
      receipt.journal_version.revision === receipt.prior_journal_version.revision + 1 &&
      canonicalJsonDigest(receipt.successor_journal) === receipt.journal_version.digest &&
      input.current?.work && input.current?.ledger && input.current?.journal &&
      input.current.work.schema === 'WorkState/v1' &&
      input.current.work.workspace_id === request.sourceTransition.transition.fence.workspace_id &&
      input.current.work.binding.lifecycle_work_id === request.identity.work_id &&
      input.current.ledger.schema === 'CoordinationLedger/v1' &&
      input.current.ledger.workspace_id === request.sourceTransition.transition.fence.workspace_id &&
      input.current.journal.schema === 'MastraSessionLedger/v1' &&
      input.current.journal.workspace_id === request.sourceTransition.transition.fence.workspace_id &&
      input.current.journal.work_id === request.identity.work_id &&
      same(input.current.work, receipt.successor_work) &&
      same(input.current.ledger, receipt.successor_ledger) &&
      same(input.current.journal, receipt.successor_journal) &&
      same(input.current.work_version, receipt.work_version) &&
      same(input.current.ledger_version, receipt.ledger_version) &&
      same(input.current.journal_version, receipt.journal_version) &&
      receipt.work_version.revision === receipt.successor_work.revision &&
      canonicalJsonDigest(receipt.successor_work) === receipt.work_version.digest &&
      receipt.ledger_version.revision === receipt.successor_ledger.revision &&
      canonicalJsonDigest(receipt.successor_ledger) === receipt.ledger_version.digest &&
      canonicalJsonDigest(receipt.successor_binding) === canonicalJsonDigest(receipt.successor_work.binding) &&
      action.request.corrective_execution === undefined &&
      Array.isArray(input.current.work.execution.assignment_attempts) &&
      input.current.work.execution.assignment_attempts.every((attempt) => ['completed', 'no_effect'].includes(attempt.status)),
    'future configured-frontier snapshot, prefix or prior CAS differs',
  );
  const priorWork = receipt.prior_work,
    priorLedger = receipt.prior_ledger,
    priorRelease = priorLedger.operations.at(-1),
    priorTicket = priorRelease && priorLedger.tickets.find((entry) => entry.ticket_id === priorRelease.ticket_id),
    priorClaims = priorTicket && priorLedger.claims.filter((entry) => entry.ticket_id === priorTicket.ticket_id),
    { work, ledger } = input.current,
    executionResource = `execution:${receipt.request.identity.work_id}`,
    lease = work.lease,
    ticket = lease && ledger.tickets.find((entry) => entry.ticket_id === lease.ticket_id),
    claims = ticket ? ledger.claims.filter((entry) => entry.ticket_id === ticket.ticket_id) : [],
    nextTicket = ticket && priorTicket && {
      ...priorTicket,
      ticket_id: ticket.ticket_id,
      generation: ticket.generation,
      sequence: ticket.sequence,
      source_revision: ticket.source_revision,
      status: 'active',
      claim_ids: ticket.claim_ids,
      expires_at: ticket.expires_at,
      active_resources: ticket.active_resources,
      blocked_resources: ticket.blocked_resources,
      created_at: ticket.created_at,
    },
    nextClaim = claims.length === 1 && priorClaims?.length === 1 && {
      ...priorClaims[0],
      claim_id: claims[0].claim_id,
      ticket_id: claims[0].ticket_id,
      generation: claims[0].generation,
      status: 'active',
      lease_expires_at: claims[0].lease_expires_at,
      created_at: claims[0].created_at,
      renewed_at: claims[0].renewed_at,
    };
  required(
    priorWork.lease === null &&
      priorWork.execution.status === 'suspended' &&
      priorWork.execution.phase === 'awaiting_followup' &&
      priorWork.lifecycle.phase === 'INTAKE' &&
      priorWork.lifecycle.seal === null &&
      priorRelease?.schema === 'CoordinationOperation/v1' &&
      priorRelease.kind === 'release' &&
      priorRelease.ticket_id === priorTicket?.ticket_id &&
      priorRelease.work_id === receipt.request.identity.work_id &&
      priorRelease.thread_id === receipt.request.nativeSessionHandle &&
      priorRelease.source_revision === priorWork.binding.work_source_revision &&
      priorRelease.resources.length === 1 &&
      priorRelease.resources[0] === executionResource &&
      priorRelease.decision_pointer === receipt.request.originalRequestPointer &&
      priorRelease.from_ledger_revision === priorLedger.revision - 1 &&
      priorRelease.to_ledger_revision === priorLedger.revision &&
      priorTicket?.status === 'released' &&
      priorTicket.work_id === receipt.request.identity.work_id &&
      priorTicket.repository_id === receipt.request.identity.repository_id &&
      same(priorTicket.project_ids, receipt.request.identity.project_ids) &&
      priorTicket.integrations_digest === receipt.request.identity.integrations_digest &&
      priorTicket.thread_id === receipt.request.nativeSessionHandle &&
      priorTicket.source_revision === priorWork.binding.work_source_revision &&
      priorTicket.exclusive_resources.length === 1 &&
      priorTicket.exclusive_resources[0] === executionResource &&
      priorTicket.expires_at === null &&
      priorTicket.active_resources.length === 0 &&
      priorClaims?.length === 1 &&
      priorClaims[0].status === 'released' &&
      priorClaims[0].thread_id === receipt.request.nativeSessionHandle &&
      priorClaims[0].work_id === receipt.request.identity.work_id &&
      receipt.successor_ledger.next_sequence === priorLedger.next_sequence + 1 &&
      receipt.successor_ledger.open_generation === priorLedger.open_generation &&
      receipt.successor_ledger.operations.length === priorLedger.operations.length &&
      same(receipt.successor_ledger.operations, priorLedger.operations) &&
      receipt.successor_ledger.tickets.length === priorLedger.tickets.length + 1 &&
      same(receipt.successor_ledger.tickets.filter((entry) => entry.ticket_id !== ticket?.ticket_id), priorLedger.tickets) &&
      same(receipt.successor_ledger.tickets.find((entry) => entry.ticket_id === ticket?.ticket_id), ticket) &&
      receipt.successor_ledger.claims.length === priorLedger.claims.length + 1 &&
      same(receipt.successor_ledger.claims.filter((entry) => entry.claim_id !== claims[0]?.claim_id), priorLedger.claims) &&
      same(receipt.successor_ledger.claims.find((entry) => entry.claim_id === claims[0]?.claim_id), claims[0]) &&
      nextTicket?.sequence === priorLedger.next_sequence &&
      nextTicket?.generation === priorLedger.open_generation &&
      same(nextTicket, ticket) &&
      same(nextClaim, claims[0]) &&
      !priorLedger.tickets.some((candidate) =>
        candidate.ticket_id !== priorTicket?.ticket_id &&
        ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(candidate.status) &&
        candidate.exclusive_resources.includes(executionResource)),
    'future configured-frontier prior owner release or FIFO beforeimage differs',
  );
  required(
    work.execution.status === 'active' && work.execution.phase === 'review' &&
      lease?.thread_id === receipt.request.nativeSessionHandle &&
      ticket?.status === 'active' && ticket.work_id === receipt.request.identity.work_id &&
      ticket.thread_id === receipt.request.nativeSessionHandle &&
      ticket.source_revision === receipt.request.currentSourceScope.digest &&
      ticket.exclusive_resources.length === 1 && ticket.exclusive_resources[0] === executionResource &&
      ticket.active_resources.length === 1 && ticket.active_resources[0] === executionResource &&
      ticket.expires_at !== null && Date.parse(ticket.expires_at) > Date.now() &&
      claims.length === 1 && claims[0].status === 'active' &&
      claims[0].thread_id === receipt.request.nativeSessionHandle &&
      claims[0].work_id === receipt.request.identity.work_id &&
      Date.parse(claims[0].lease_expires_at) > Date.now() &&
      !ledger.tickets.some((candidate) =>
        candidate.ticket_id !== ticket.ticket_id && candidate.sequence < ticket.sequence &&
        ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(candidate.status) &&
        candidate.exclusive_resources.includes(executionResource)),
    'future configured-frontier owner or FIFO beforeimage differs',
  );
  return { branch: 'configured_frontier', snapshot_sha256: receipt.frontier_snapshot.snapshot_sha256 };
}

export function assertApplicableRepairBranch(branch) {
  required(branch === 'historical_terminal_review', 'configured-frontier repair is validation-only until ordinary readers adopt it');
}

function parse(args) {
  const values = {};
  required(args.length % 2 === 0, 'repair arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    required(typeof key === 'string' && key.startsWith('--') && typeof value === 'string' && value.length > 0 && !Object.hasOwn(values, key), 'invalid arguments');
    values[key] = value;
  }
  required(
    values['--kind'] === 'delivered-work-continuation' &&
      ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id'] ?? ''),
    'mode, project root or repair id invalid',
  );
  const expected = (['inspect', 'plan'].includes(values['--mode'])
    ? ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--timestamp', '--projects', '--work-id', '--attempt', '--action-id']
    : ['--kind', '--mode', '--project-root', '--repair-id']);
  required(same(Object.keys(values).sort(), expected.sort()), 'missing or unexpected arguments');
  if (['inspect', 'plan'].includes(values['--mode'])) {
    const projectIds = values['--projects'].split(',');
    required(
      values['--actor'].trim() && values['--timestamp'].trim() && values['--work-id'] &&
        values['--actor'] === values['--actor'].trim() && values['--actor'].length <= 256 && !/\p{Cc}/u.test(values['--actor']) &&
        rfc3339TimestampMilliseconds(values['--timestamp']) !== null &&
        /^[1-9][0-9]*$/.test(values['--attempt']) && digestPattern.test(values['--action-id']) &&
        projectIds.length > 0 && projectIds.every((id) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) &&
        new Set(projectIds).size === projectIds.length,
      'inspect/plan identity or attribution missing',
    );
  }
  return values;
}
const maxPlanBytes = 64 * 1024 * 1024;
function safeIdentity(file, label) {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, `${label} must be a single-link regular file`);
  return { dev: info.dev, ino: info.ino };
}
function readPlan(access, root, repairId) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`, file = path.join(root, relative),
    before = lstatSync(file);
  required(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= maxPlanBytes, 'repair plan path or size is unsafe');
  const bytes = access.readBytes(relative, 'delivered-work continuation repair plan'), after = lstatSync(file);
  required(
    after.isFile() && !after.isSymbolicLink() && after.nlink === 1 &&
      before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs &&
      bytes.length <= maxPlanBytes,
    'repair plan identity changed or bounded read exceeded',
  );
  const plan = JSON.parse(bytes.toString('utf8'));
  required(bytes.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)), 'repair plan bytes are not canonical');
  return plan;
}
function writePlan(access, repairId, plan) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`, bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  required(bytes.length <= maxPlanBytes, 'repair plan exceeds the bounded artifact size');
  access.ensureDirectory(`.agent/work/${repairId}`, 'delivered-work continuation repair work root');
  access.writeExclusive(relative, bytes.toString('utf8'), 'delivered-work continuation repair plan');
}
function validatePlan(value, workspaceId) {
  required(value?.schema === 'DeliveredWorkContinuationIntegrityRepairPlan/v1', 'repair plan schema differs');
  const { digest, ...body } = value;
  required(digestPattern.test(digest) && canonicalJsonDigest(body) === digest, 'frozen repair plan digest differs');
  required(value.inspection.workspace_id === workspaceId, 'repair plan belongs to another workspace');
  return value;
}

export async function runDeliveredWorkContinuationRepair(args) {
  const values = parse(args), root = values['--project-root'], access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root), repairId = values['--repair-id'],
    workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
    relativeDatabasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  access.assertDirectory(config.control.work_root, 'configured Host work root');
  required(access.fileExists(relativeDatabasePath, 'configured Host database'), 'configured Host database is absent or unsafe');
  const databasePath = sessionHandoffDatabasePath(root, config), databaseIdentity = safeIdentity(databasePath, 'configured Host database'),
    readonly = ['inspect', 'plan'].includes(values['--mode']),
    database = readonly
      ? new Database(databasePath, { readonly: true, create: false, strict: true })
      : openHostStateDatabase(databasePath);
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root, undefined, undefined, undefined, readonly);
    if (readonly) {
      const projectIds = values['--projects'].split(',').sort(),
        project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
      const inspection = store.inspectDeliveredWorkContinuationRepair(
        { repository_id: config.repository.repository_id, project_ids: projectIds, integrations_digest: project.integrations_digest, work_id: values['--work-id'] },
        Number(values['--attempt']),
        values['--action-id'],
      );
      const planBody = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch: 'historical_terminal_review',
        repair_id: repairId,
        actor: values['--actor'],
        timestamp: values['--timestamp'],
        inspection,
      };
      if (values['--mode'] === 'inspect')
        return { status: 'repairable_current_v1', repair_id: repairId, plan_digest: canonicalJsonDigest(planBody), branch: planBody.branch };
      const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
      writePlan(access, repairId, plan);
      return { status: 'planned', repair_id: repairId, plan_digest: plan.digest, branch: plan.branch };
    }
    const plan = validatePlan(readPlan(access, root, repairId), workspaceId);
    assertApplicableRepairBranch(plan.branch);
    if (values['--mode'] === 'apply') store.reserveDeliveredWorkContinuationRepair(plan);
    return store.applyDeliveredWorkContinuationRepair(plan);
  } finally {
    database.close(true);
    const afterIdentity = safeIdentity(databasePath, 'configured Host database');
    required(databaseIdentity.dev === afterIdentity.dev && databaseIdentity.ino === afterIdentity.ino, 'configured Host database identity changed');
  }
}
