import { createHash, timingSafeEqual } from 'node:crypto';

interface ServiceOperationLaunchClaimImage {
  readonly workspace_id: string;
  readonly owner_kind: string;
  readonly operation_id: string;
  readonly request_digest: string;
  readonly owner_token: string | null;
  readonly phase: string;
  readonly launch_pid: number | null;
}

const capabilityPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u;

export function serviceOperationLaunchCapabilityDigest(capability: string): string {
  if (!capabilityPattern.test(capability)) throw new Error('Service operation launch capability is invalid.');
  return createHash('sha256').update(capability, 'utf8').digest('hex');
}

export function serviceOperationLaunchCapabilityMatches(expectedDigest: string | null, capability: unknown): boolean {
  if (
    expectedDigest === null ||
    !/^[a-f0-9]{64}$/u.test(expectedDigest) ||
    typeof capability !== 'string' ||
    !capabilityPattern.test(capability)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(expectedDigest, 'hex'),
    Buffer.from(createHash('sha256').update(capability, 'utf8').digest('hex'), 'hex'),
  );
}

export function serviceOperationLaunchClaimMatches(
  prior: ServiceOperationLaunchClaimImage | null,
  workspaceId: string,
  kind: string,
  operationId: string,
  requestDigest: string,
  pid: number,
  capability: unknown,
): boolean {
  return (
    prior !== null &&
    prior.workspace_id === workspaceId &&
    prior.owner_kind === kind &&
    prior.operation_id === operationId &&
    prior.request_digest === requestDigest &&
    prior.phase === 'launching' &&
    prior.launch_pid === pid &&
    serviceOperationLaunchCapabilityMatches(prior.owner_token, capability)
  );
}
