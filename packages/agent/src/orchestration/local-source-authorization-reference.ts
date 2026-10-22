import type { LifecycleArtifactReference } from '../lifecycle/lifecycle-state.js';

export function isCurrentLocalSourceAuthorizationReference(
  reference: Pick<LifecycleArtifactReference, 'kind' | 'disposition' | 'decision' | 'artifact_schema'>,
): boolean {
  return (
    reference.kind === 'execution_approval' &&
    reference.disposition === 'current' &&
    reference.decision === 'approved' &&
    reference.artifact_schema === 'LocalSourceWriteAuthorization/v1'
  );
}
