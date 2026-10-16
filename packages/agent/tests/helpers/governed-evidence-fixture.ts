import {
  computeWriteOperationHash,
  toAuthorizationReceipt,
  type AuthorizationReceipt,
  type GovernedWriteIntent,
  type ProjectAuthorizationRequest,
  type VerifiedApprovalEvidence,
} from '../../src/contracts/public-ingress.ts';
import type { ProjectContext } from '../../src/config/project-context.ts';

export interface GovernedEvidenceFixture {
  readonly approval: VerifiedApprovalEvidence;
  readonly intent: GovernedWriteIntent;
  readonly operationHash: string;
  readonly receipt: AuthorizationReceipt | undefined;
  readonly authorizationRequest: (operationHash?: string) => ProjectAuthorizationRequest;
}

/** Pure synthetic fixture construction from ingress identity fields and time. */
export type GovernedEvidenceProject = Pick<ProjectContext, 'repository_id' | 'registry_hash'> & {
  readonly project_bindings: readonly Pick<ProjectContext['project_bindings'][number], 'project_id'>[];
};

export function createGovernedEvidenceFixture(
  project: GovernedEvidenceProject,
  nowMs: number,
  expectReturned: <T>(operation: () => T) => T,
): GovernedEvidenceFixture {
  const binding = project.project_bindings[0];
  if (!binding) throw new Error('Expected a configured project binding.');

  const authorizationRequest = (operationHash?: string): ProjectAuthorizationRequest => ({
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: project.repository_id,
    project: binding.project_id,
    resourceTenant: project.repository_id,
    resourceProject: binding.project_id,
    registryHash: project.registry_hash,
    ...(operationHash ? { operationHash } : {}),
  });
  const payload = { path: 'agent-runtime-new/example.txt', value: 'updated' };
  const operation = 'repository.write';
  const operationHash = expectReturned(() =>
    computeWriteOperationHash({
      operation,
      payload,
      principal: 'principal-1',
      role: 'developer-orchestrator',
      tenant: project.repository_id,
      project: binding.project_id,
      resourceTenant: project.repository_id,
      resourceProject: binding.project_id,
      registryHash: project.registry_hash,
    }),
  );
  const approvedAt = new Date(nowMs - 1_000).toISOString();
  const expiresAt = new Date(nowMs + 60_000).toISOString();
  const intent: GovernedWriteIntent = {
    operation,
    payload,
    authorization: authorizationRequest(),
    approval: {
      decision: 'approved',
      decision_id: 'approval-1',
      approver: 'operator-1',
      tenant: project.repository_id,
      project: binding.project_id,
      operation_hash: operationHash,
      approved_at: approvedAt,
      expires_at: expiresAt,
    },
  };
  const receipt = expectReturned(() =>
    toAuthorizationReceipt(authorizationRequest(operationHash), 'decision-1', approvedAt),
  );
  const approval: VerifiedApprovalEvidence = {
    ...intent.approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: 'verification-1',
    verified_at: approvedAt,
  };
  return { approval, intent, operationHash, receipt, authorizationRequest };
}
