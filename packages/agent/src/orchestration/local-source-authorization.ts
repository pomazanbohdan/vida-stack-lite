import { createHash } from 'node:crypto';
import z from 'zod';
import { loadRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { computeEdictumWorkflowApprovalEvidenceDigest } from '../governance/edictum-boundary.js';
import {
  canonicalHostSourceWriteApproval,
  type HostStateStore,
  type WorkflowAttemptApprovalVerifier,
} from '../host-state.js';
import { sessionBridgeRunId } from './mastra-session-bridge.js';
import {
  produceSourceWritePreflightApproval,
  type SourceWritePreflightContextResolver,
} from './source-preflight-operations.js';
import { acceptedSourceAuthorizationRevision } from './admitted-development-packet.js';

const authorizationSchema = z
  .object({
    schema: z.literal('LocalSourceWriteAuthorization/v1'),
    action: z.literal('source.write'),
    user_instruction_ref: z.string().min(1).max(512),
    work_id: z.string().min(1).max(256),
    attempt: z.number().int().positive(),
    scope_digest: z.string().regex(/^[a-f0-9]{64}$/),
    config_digest: z.string().regex(/^[a-f0-9]{64}$/),
    workflow_id: z.string().min(1).max(256),
    stage_ids: z.array(z.string().min(1)).min(1).max(64),
    implementation_paths: z.array(z.string().min(1)).min(1).max(512),
    native_session_handle: z.string().min(1).max(256),
  })
  .strict();
export type LocalSourceWriteAuthorization = z.infer<typeof authorizationSchema>;

export function readLocalSourceWriteAuthorization(
  repositoryRoot: string,
  relativePath: string,
): {
  readonly authorization: LocalSourceWriteAuthorization;
  readonly sha256: string;
} {
  const bytes = requireSafeRepositoryAccess(repositoryRoot).readBytes(relativePath, 'local source authorization');
  if (bytes.length > 32768) throw new Error('local source authorization exceeds the bounded artifact size');
  const authorization = authorizationSchema.parse(JSON.parse(bytes.toString('utf8')));
  return { authorization, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Check a trusted local controller's scoped cooperative declaration.
 * The controller establishes user authorization in the current conversation;
 * this verifier checks binding consistency, not human-directive authenticity.
 */
export function createLocalSourceWriteApprovalVerifier(
  repositoryRoot: string,
  getStore: () => HostStateStore,
  resolvePreflightContext?: SourceWritePreflightContextResolver,
): WorkflowAttemptApprovalVerifier {
  const principal = 'trusted-local-session-source-write';
  return {
    principal,
    verify: async (request) => {
      if (request.action !== 'source.write') return null;
      const store = getStore();
      const current = store.readHostStateSnapshot(request.identity);
      const work = current.work;
      if (
        !work ||
        !work.lease ||
        work.execution.status !== 'active' ||
        work.binding.config_digest !== request.config_digest ||
        work.binding.workflow_id !== request.workflow_id ||
        canonicalJsonDigest(work.lease) !== canonicalJsonDigest(request.lease)
      )
        return null;
      const journal = store.readWorkSessionJournal(request.identity);
      const initialContinuation = journal
        ? store.readInitialSourceContinuationReceipt(request.identity, journal.attempt)
        : null;
      const references = work.lifecycle.references.filter(
        (item) =>
          item.kind === 'execution_approval' &&
          item.disposition === 'current' &&
          item.decision === 'approved' &&
          item.artifact_schema === 'LocalSourceWriteAuthorization/v1',
      );
      if (references.length !== 1) return null;
      const reference = references[0]!;
      let authorizationSourceRevision: string;
      try {
        authorizationSourceRevision = acceptedSourceAuthorizationRevision(
          work,
          journal?.state,
          reference,
          initialContinuation,
        );
      } catch {
        return null;
      }
      if (reference.scope_id !== work.binding.scope_id || reference.source_revision !== authorizationSourceRevision)
        return null;
      let bound;
      try {
        bound = readLocalSourceWriteAuthorization(repositoryRoot, reference.path);
      } catch {
        return null;
      }
      const { authorization, sha256 } = bound;
      if (
        sha256 !== reference.sha256 ||
        authorization.work_id !== request.identity.work_id ||
        authorization.scope_digest !== authorizationSourceRevision ||
        authorization.config_digest !== request.config_digest ||
        authorization.workflow_id !== request.workflow_id ||
        !authorization.stage_ids.includes(request.stage_id) ||
        (authorization.native_session_handle !== request.lease.thread_id &&
          !work.execution.assignment_attempts.some(
            (entry) =>
              entry.status === 'no_effect' &&
              entry.lease.thread_id === authorization.native_session_handle &&
              canonicalJsonDigest(entry.reconciliation?.retry_lease) === canonicalJsonDigest(request.lease),
          )) ||
        reference.record_id !== authorization.user_instruction_ref ||
        reference.principal !== 'local-session:' + canonicalJsonDigest(authorization.native_session_handle) ||
        canonicalJsonDigest([...authorization.implementation_paths].sort()) !==
          canonicalJsonDigest([...work.binding.implementation_paths].sort()) ||
        (journal !== null && authorization.attempt !== journal.attempt) ||
        work.execution.run_id !==
          sessionBridgeRunId(
            store.workspaceId,
            {
              work_id: authorization.work_id,
              attempt: authorization.attempt,
              scope_digest: authorization.scope_digest,
            },
            authorization.workflow_id,
          )
      )
        return null;
      const config = loadRuntimeConfig(repositoryRoot);
      if (runtimeConfigDigest(config) !== request.config_digest) return null;
      const stage = config.workflows[request.workflow_id]?.stages.find((item) => item.id === request.stage_id);
      const assignment = stage?.assignments[request.assignment_index];
      if (!assignment || config.agents.profiles[assignment.profile]?.mutation_scope !== 'repository_source')
        return null;
      const ticket = current.ledger?.tickets.find((item) => item.ticket_id === request.lease.ticket_id);
      const claim = current.ledger?.claims.find(
        (item) =>
          item.ticket_id === request.lease.ticket_id &&
          item.thread_id === request.lease.thread_id &&
          item.status === 'active',
      );
      const expiresAt = Math.min(
        Date.parse(ticket?.expires_at ?? ''),
        Date.parse(claim?.lease_expires_at ?? ''),
        Date.now() + 300000,
      );
      if (!ticket || ticket.status !== 'active' || !claim || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
        return null;
      if (!resolvePreflightContext) return null;
      const unsigned = {
        schema: 'EdictumWorkflowApproval/v1' as const,
        stage_id: request.stage_id,
        approval_id: 'local-' + canonicalJsonDigest({ sha256, operation: request.operation_hash }),
        approver: 'trusted-local-session-source-write',
        operation_hash: request.operation_hash,
        tenant: request.identity.repository_id,
        project: request.identity.project_ids[0]!,
        approved_at: new Date().toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      };
      const receipt = { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
      const hostApproval = canonicalHostSourceWriteApproval(request, principal, receipt);
      try {
        const context = await resolvePreflightContext(request, current);
        if (!context || canonicalJsonDigest(context.hostSnapshot) !== canonicalJsonDigest(current)) return null;
        await produceSourceWritePreflightApproval({
          repositoryRoot,
          context,
          request,
          hostApprovalPrincipal: principal,
          hostApproval,
        });
        const latest = store.readHostStateSnapshot(request.identity);
        if (canonicalJsonDigest(latest) !== canonicalJsonDigest(current)) return null;
        return receipt;
      } catch {
        return null;
      }
    },
  };
}
