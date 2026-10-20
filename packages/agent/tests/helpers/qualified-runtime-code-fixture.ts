import type {
  QualifiedRuntimeCodeContinuationRequest,
  QualifiedRuntimeCodeEndpoints,
} from '../../src/orchestration/qualified-runtime-code-continuation.ts';

/** Trusted unit endpoint seam; this does not attest installation, native dispatch or Runtime acceptance. */
export function qualifiedRuntimeCodeEndpointFixture(
  candidate: QualifiedRuntimeCodeContinuationRequest,
): QualifiedRuntimeCodeEndpoints {
  return {
    oldRuntime: {
      codeDigest: candidate.oldRuntimeCodeDigest,
      codePaths: candidate.oldRuntimeCodePaths,
      manifestRef: candidate.oldManifestRef,
      manifestDigest: candidate.oldManifestDigest,
      installRef: candidate.oldInstallRef,
    },
    currentRuntime: {
      codeDigest: candidate.currentRuntimeCodeDigest,
      codePaths: candidate.currentRuntimeCodePaths,
      manifestRef: candidate.currentManifestRef,
      manifestDigest: candidate.currentManifestDigest,
      installRef: candidate.currentInstallRef,
    },
    systemUpdate: { ref: candidate.systemUpdateRef, operationId: candidate.systemUpdateOperationId },
    nativeSelfAttestationDigest: candidate.nativeSelfAttestationDigest,
  };
}
