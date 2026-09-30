import {
  checkParsePolicySet,
  checkParseSchema,
  isAuthorized,
  validate,
  type AuthorizationAnswer,
  type EntityJson,
  type PolicySet,
} from '@cedar-policy/cedar-wasm/nodejs';
import { Result } from 'neverthrow';
import {
  canonicalJsonDigest,
  toAuthorizationReceipt,
  validateAuthorizationRequest,
  type AuthorizationReceipt,
  type TrustedProjectIdentity,
} from '../contracts/public-ingress.js';
import {
  requireAbsoluteRepositoryRoot,
  validateProjectContextBinding,
  type ProjectContext,
} from '../config/project-context.js';
import { assertLoadedRuntimeConfig, type AgentRuntimeConfig } from '../config/runtime-config.js';
export interface ProjectAuthorizationResult {
  readonly decision: 'allow' | 'deny';
  readonly diagnostics: readonly string[];
  readonly receipt?: AuthorizationReceipt;
}
export type ProjectAuthorizer = (
  input: unknown,
  identity?: TrustedProjectIdentity,
  projectContext?: ProjectContext,
) => ProjectAuthorizationResult;
function entity(type: string, id: string, attrs: Record<string, string>): EntityJson {
  return { uid: { type, id }, attrs, parents: [] };
}
function policySet(staticPolicies: string): PolicySet {
  return { staticPolicies };
}
function deny(diagnostics: readonly string[]): ProjectAuthorizationResult {
  return { decision: 'deny', diagnostics };
}
function reject(conditions: readonly boolean[], message: string): void {
  conditions.filter(Boolean).forEach(() => {
    throw new Error(message);
  });
}
export function validateCedarPolicySet(staticPolicies: string): {
  readonly valid: boolean;
  readonly diagnostics: readonly string[];
} {
  const parsed = checkParsePolicySet({ staticPolicies });
  const failureResult = parsed as Extract<typeof parsed, { type: 'failure' }>;
  const failure = (): { valid: boolean; diagnostics: readonly string[] } => ({
    valid: false,
    diagnostics: failureResult.errors.map((error) => error.message),
  });
  const success = (): { valid: boolean; diagnostics: readonly string[] } => ({ valid: true, diagnostics: [] });
  return parsed.type === 'failure' ? failure() : success();
}
type AuthorizationParameters = readonly [
  unknown,
  TrustedProjectIdentity | undefined,
  ProjectContext | undefined,
  string,
  string,
  string,
];
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function authorized(value: ProjectAuthorizationResult): ProjectAuthorizationResult {
  return value;
}
function deniedByError(message: string): ProjectAuthorizationResult {
  return deny([message]);
}
const authorizationAttempt = Result.fromThrowable((parameters: AuthorizationParameters): ProjectAuthorizationResult => {
  const [input, identity, projectContext, trustedRepositoryRoot, staticPolicies, cedarSchema] = parameters;
  const request = validateAuthorizationRequest(input);
  const identityFields = identity ?? ({} as Partial<TrustedProjectIdentity>);
  const contextFields = projectContext ?? ({} as Partial<ProjectContext>);
  const identityValid = [
    identityFields.schema === 'TrustedProjectIdentity/v1',
    identityFields.source === 'authenticated-context',
  ].every(Boolean);
  const bindingValid =
    projectContext !== undefined &&
    (validateProjectContextBinding(projectContext!, requireAbsoluteRepositoryRoot(trustedRepositoryRoot)), true);
  const claimValid = [
    contextFields.repository_id === request.tenant,
    Array.isArray(contextFields.project_ids) && contextFields.project_ids.includes(request.project),
    contextFields.repository_id === request.resourceTenant,
    Array.isArray(contextFields.project_ids) && contextFields.project_ids.includes(request.resourceProject),
    contextFields.integration_bindings?.some((binding) => binding.project_id === request.project) === true,
    contextFields.integration_bindings?.some((binding) => binding.project_id === request.resourceProject) === true,
    request.registryHash === contextFields.registry_hash,
    identityFields.registry_hash === contextFields.registry_hash,
  ].every(Boolean);
  const operationValid = [request.action === 'read', request.operationHash !== undefined].some(Boolean);
  const identityClaimsValid = [
    identityFields.principal === request.principal,
    identityFields.role === request.role,
    identityFields.tenant === request.tenant,
    identityFields.project === request.project,
  ].every(Boolean);
  const valid = [identityValid, bindingValid, claimValid, operationValid, identityClaimsValid].every(Boolean);
  const execute = (): ProjectAuthorizationResult => {
    const result: AuthorizationAnswer = isAuthorized({
      principal: { type: 'User', id: request.principal },
      action: { type: 'Action', id: request.action },
      resource: { type: 'Project', id: request.resourceProject },
      context: { registry_hash: projectContext!.registry_hash },
      schema: cedarSchema,
      validateRequest: true,
      policies: policySet(staticPolicies),
      entities: [
        entity('User', request.principal, { role: request.role, tenant: request.tenant, project: request.project }),
        entity('Project', request.resourceProject, {
          tenant: request.resourceTenant,
          project: request.resourceProject,
        }),
      ],
    });
    const successful = result.type !== 'failure';
    const successResult = result as Extract<AuthorizationAnswer, { type: 'success' }>;
    const allowed = [successful, successResult.response?.decision === 'allow'].every(Boolean);
    const decisionId = 'cedar-' + canonicalJsonDigest(request).slice(0, 24);
    const receipt = toAuthorizationReceipt(request, decisionId, new Date().toISOString());
    const failureResult = result as Extract<AuthorizationAnswer, { type: 'failure' }>;
    const diagnostics = [
      () => failureResult.errors.map((error) => error.message),
      () => successResult.response.diagnostics.reason,
    ][Number(successful)]!();
    return allowed
      ? {
          decision: 'allow',
          diagnostics: successResult.response.diagnostics.reason,
          ...Object.fromEntries([['receipt', receipt]].filter(() => receipt !== undefined)),
        }
      : deny(diagnostics);
  };
  const factories = [() => deny(['authorization claims do not satisfy the configured project boundary']), execute];
  return factories[Number(valid)]!();
}, errorMessage);
export function authorizeProject(
  input: unknown,
  identity: TrustedProjectIdentity | undefined,
  projectContext: ProjectContext | undefined,
  trustedRepositoryRoot: string,
  staticPolicies: string,
  cedarSchema: string,
): ProjectAuthorizationResult {
  return authorizationAttempt([
    input,
    identity,
    projectContext,
    trustedRepositoryRoot,
    staticPolicies,
    cedarSchema,
  ]).match(authorized, deniedByError);
}
export function createConfiguredProjectAuthorizer(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
): ProjectAuthorizer {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  assertLoadedRuntimeConfig(config, root);
  const policy = config.authorization.cedar.policy;
  const cedarSchema = config.authorization.cedar.schema_text;
  assertConfiguredCedarPolicy(policy, cedarSchema);
  return (input, identity, projectContext) =>
    authorizeProject(input, identity, projectContext, root, policy, cedarSchema);
}
export function assertConfiguredCedarPolicy(policy: string, cedarSchema: string): void {
  const parsedPolicy = checkParsePolicySet({ staticPolicies: policy });
  reject([parsedPolicy.type === 'failure'], 'configured Cedar policy is invalid');
  const parsedSchema = checkParseSchema(cedarSchema);
  reject([parsedSchema.type === 'failure'], 'configured Cedar schema is invalid');
  const validated = validate({ schema: cedarSchema, policies: { staticPolicies: policy } });
  reject(
    [
      validated.type === 'failure' ||
        validated.validationErrors.length > 0 ||
        validated.validationWarnings.some((warning) =>
          warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
        ),
    ],
    'configured Cedar policy/schema semantic validation failed',
  );
}
export type { ProjectAuthorizationRequest } from '../contracts/public-ingress.js';
