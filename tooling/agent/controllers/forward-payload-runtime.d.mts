/** Compiler companion for the transitional Root adapter; package APIs own the types. */
interface ForwardPayloadRuntime {
  readonly canonicalJsonDigest: typeof import('../../../packages/agent/src/contracts/public-ingress.js').canonicalJsonDigest;
  readonly compileImplementationScopeValidator: typeof import('../../../packages/agent/src/contracts/implementation-scope.js').compileImplementationScopeValidator;
  readonly executeDocumentationClearOperation: typeof import('../../../packages/agent/src/documentation/clear.js').executeDocumentationClearOperation;
  readonly produceDocumentationClearCheckpoint: typeof import('../../../packages/agent/src/documentation/clear.js').produceDocumentationClearCheckpoint;
  readonly requireSafeRepositoryAccess: typeof import('../../../packages/agent/src/config/safe-repository-access.js').requireSafeRepositoryAccess;
  readonly snapshotDeclaredSources: typeof import('../../../packages/agent/src/orchestration/scoped-source-snapshot.js').snapshotDeclaredSources;
}

export function scanForwardResources(
  source: string,
  parser: { parse(source: string, options: { sourceType: 'module'; plugins: ['typescript'] }): unknown },
): string[];

export function loadForwardPayloadRuntime(
  repositoryRoot: string,
  payloadRoot: string,
  expectedManifestSha: string,
): Promise<ForwardPayloadRuntime>;
