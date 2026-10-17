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

function isServiceOperationLaunchCapability(capability: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u.test(capability);
}

export function serviceOperationLaunchCapabilityDigest(capability: string): string {
  if (!isServiceOperationLaunchCapability(capability))
    throw new Error('Service operation launch capability is invalid.');
  return createHash('sha256').update(capability).digest('hex');
}

export function serviceOperationLaunchCapabilityMatches(expectedDigest: string | null, capability: unknown): boolean {
  if (
    expectedDigest === null ||
    !/^[a-f0-9]{64}$/u.test(expectedDigest) ||
    typeof capability !== 'string' ||
    !isServiceOperationLaunchCapability(capability)
  )
    return false;
  return timingSafeEqual(Buffer.from(expectedDigest, 'hex'), createHash('sha256').update(capability).digest());
}

export function serviceOperationLaunchClaimMatches<T extends ServiceOperationLaunchClaimImage>(
  prior: T | null,
  workspaceId: string,
  kind: string,
  operationId: string,
  requestDigest: string,
  pid: number,
  capability: unknown,
): prior is T {
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
