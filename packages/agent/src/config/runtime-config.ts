import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { runtimeExecutableInventory } from '../../tooling/maintained-source-inventory.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';
import { parseDocument } from 'yaml';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from './safe-repository-access.js';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import researchResultSchema from '../../schemas/research-result.v1.schema.json' with { type: 'json' };
import researchSynthesisSchema from '../../schemas/research-synthesis.v1.schema.json' with { type: 'json' };

export {
  detectNativeNoFollowCapability,
  nativeNoFollowAvailable,
  noFollowFlag,
  requireNativeNoFollowCapability,
  type NativeNoFollowCapability,
} from './host-capability.js';

const CONFIG_FILE = 'agent-runtime.config.v1.yaml';
const CONFIG_SCHEMA_ID = 'https://agent-runtime.invalid/schemas/agent-runtime-config.v1.schema.json';
const CONFIG_SCHEMA_SHA256 = 'ed7c14b68f51c103aa06172b057a7c60cf58af69fa6727bad6aa11d9180d40e9';
const CONFIG_SCHEMA_FILE = fileURLToPath(new URL('../../schemas/agent-runtime-config.v1.schema.json', import.meta.url));
const resourceRoot = path.dirname(path.dirname(CONFIG_SCHEMA_FILE));
const RUNTIME_PACKAGE_ROOT = existsSync(path.join(resourceRoot, 'package.json'))
  ? resourceRoot
  : path.dirname(resourceRoot);

/** Package resources are owned by the executing npm package, never the consumer. */
export function runtimePackageAccess(): SafeRepositoryAccess {
  const access = requireSafeRepositoryAccess(RUNTIME_PACKAGE_ROOT);
  const manifest = JSON.parse(access.readText('package.json', 'runtime package identity')) as { name?: unknown };
  assertCondition(manifest.name === 'vida-agent', 'runtime package identity differs');
  return access;
}
/** Logical inventory paths never expose a developer home or consumer checkout. */
export function runtimePackageCodePaths(bundle: string): readonly string[] {
  return runtimeExecutableInventory(
    runtimePackageAccess().repository_root,
    resourceRoot === RUNTIME_PACKAGE_ROOT ? 'source' : 'dist',
  ).map((file) => bundle + '/' + file);
}
const MAX_CONFIG_BYTES = 4 * 1024 * 1024;
const MAX_SNAPSHOT_NODES = 50_000;
const SOURCE_WRITE_TOOLS = new Set(['runtime.write', 'source.write']);

export const candidateIsolationGap = 'GAP-RTNEW-ISOLATION-001' as const;

export const PATH_PROFILE_KEYS = [
  'repository_root',
  'project_root',
  'code_root',
  'documentation_root',
  'wiki_root',
  'wiki_path',
  'wiki_output_root',
  'documentation_policy_path',
  'documentation_map_path',
  'documentation_index_path',
  'documentation_changelog_root',
  'documentation_evidence_root',
  'internal_root',
  'internal_requirements_root',
  'tests_root',
  'derived_output_root',
  'coordination_root',
  'work_root',
  'delivery_root',
  'import_root',
  'ledger_root',
] as const;

export type PathProfileKey = (typeof PATH_PROFILE_KEYS)[number];
export type RepositoryMode = 'monorepo';
export type ProcessingScope = 'whole_repository' | 'selected_project';
export type WorkItemKind = 'epic' | 'feature' | 'pbi' | 'story' | 'bug' | 'task' | 'research';
export type FlowIntent =
  | 'information_research'
  | 'implementation_new'
  | 'implementation_change'
  | 'bug_fix'
  | 'task_execution';
export type WorkflowStageKind = 'research' | 'synthesize' | 'develop' | 'validate' | 'test' | 'deliver';
export type MutationScope = 'none' | 'repository_source';

function hasSourceWriteTool(allowedTools: readonly string[]): boolean {
  return allowedTools.some((tool) => SOURCE_WRITE_TOOLS.has(tool));
}

export type PathProfileValues = { readonly [key in PathProfileKey]: string };
export type PathProfileOverride = Partial<Record<Exclude<PathProfileKey, 'repository_root'>, string>>;

export interface PathProfileConfig {
  readonly schema: 'PathProfileConfig/v1';
  readonly repository_mode: RepositoryMode;
  readonly processing_scope: ProcessingScope;
  readonly defaults: PathProfileValues;
}

export interface TrustedPathProfileOverride {
  readonly schema: 'TrustedPathProfileOverride/v1';
  readonly scope_id: string;
  readonly paths: PathProfileOverride;
}
export interface AgentRoleProfile {
  readonly model: string;
  readonly reasoning: string;
  readonly execution_mode: 'fast' | 'standard';
  readonly mutation_scope: MutationScope;
  readonly tools_policy: string;
  readonly egress_policy: string;
}

export interface WorkflowAssignment {
  readonly role: string;
  readonly profile: string;
  readonly contour?: 'requirements' | 'documentation' | 'code' | 'platform' | 'diagnostics' | 'security_data';
  readonly risk_flags?: readonly string[];
}

export interface WorkflowStage {
  readonly id: string;
  readonly kind: WorkflowStageKind;
  readonly mode: 'single' | 'parallel';
  readonly assignments: readonly WorkflowAssignment[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly required_after: readonly string[];
  readonly risk_flags?: readonly string[];
  readonly context_source_ids?: readonly string[];
  readonly context_skill_refs?: readonly string[];
}

export interface WorkflowDefinition {
  readonly assurance_profile: 'research_light' | 'code_full' | 'bug_focused' | 'task_focused';
  readonly max_attempts: number;
  readonly entry_stage: string;
  readonly terminal_stages: readonly string[];
  readonly stages: readonly WorkflowStage[];
  readonly edges: readonly (readonly [string, string])[];
}

export interface WorkflowBinding {
  readonly id: string;
  readonly priority: number;
  readonly team: string;
  readonly work_item_kinds: readonly WorkItemKind[];
  readonly intents: readonly FlowIntent[];
  readonly projects: readonly string[];
  readonly risks: readonly string[];
  readonly labels: readonly string[];
  readonly workflow: string;
}

export interface WorkItemSelection {
  readonly team: string;
  readonly kind: WorkItemKind;
  readonly intent: FlowIntent;
  readonly project: string;
  readonly risk_flags: readonly string[];
  readonly labels: readonly string[];
}

export type ResearchDecisionActivationClass = 'always_on' | 'lane_entry' | 'triggered_domain' | 'closure_reflection';
export type ResearchDecisionPrivacy = 'public' | 'internal' | 'sensitive_redacted';
export type ResearchDecisionInstructionStatus = 'active' | 'disabled';

export interface ResearchDecisionInstruction {
  readonly instruction_id: string;
  readonly owner: string;
  readonly revision: number;
  readonly source_path: string;
  readonly source_sha256: string;
  readonly summary_sha256: string;
  readonly activation_class: ResearchDecisionActivationClass;
  readonly triggers: readonly string[];
  readonly phases: readonly string[];
  readonly lanes: readonly string[];
  readonly output_schema: string;
  readonly max_bytes: number;
  readonly privacy: ResearchDecisionPrivacy;
  readonly status: ResearchDecisionInstructionStatus;
  readonly content: string;
}

export interface InstructionRegistry {
  readonly $schema?: string;
  readonly schema: 'InstructionRegistry/v1';
  readonly registry_id: string;
  readonly revision: number;
  readonly source_revision: string;
  readonly instructions: readonly ResearchDecisionInstruction[];
  readonly updated_at: string;
  readonly digest: string;
}

export interface ResearchDecisionConfig {
  readonly schema: 'ResearchDecisionConfig/v1';
  readonly limits: {
    readonly max_instruction_bytes: number;
    readonly max_context_bytes: number;
    readonly max_projection_bytes: number;
  };
  readonly paths: {
    readonly research_records: string;
    readonly decision_records: string;
    readonly changelog: string;
    readonly cache: string;
    readonly activation_history: string;
  };
  readonly registry: InstructionRegistry;
}

interface ProjectConfig {
  readonly project_id: string;
  readonly title: string;
  readonly project_root: string;
  readonly wiki_root: string;
  readonly wiki_path: string;
  readonly wiki_output_root: string;
  readonly internal_root: string;
  readonly ledger_root: string;
  readonly task_prefix: string;
  readonly code_selectors: readonly string[];
  readonly delivery_group: string;
  readonly path_overrides?: PathProfileOverride;
}

export interface AgentRuntimeConfig {
  readonly schema: 'AgentRuntimeConfig/v1';
  readonly config_id: string;
  readonly version: 1;
  readonly config_revision: number;
  readonly repository: {
    readonly sidecar: string;
    readonly policy: string;
    readonly root_markers: readonly string[];
    readonly repository_id: string;
    readonly title: string;
    readonly project_root: '.';
    readonly code_selectors: readonly string[];
  };
  readonly integrations: {
    readonly providers: readonly {
      readonly id: string;
      readonly provider: string;
      readonly project_id: string;
      readonly tenant_id: string;
      readonly namespace: string;
    }[];
  };
  readonly runtime: {
    readonly bundle: string;
    readonly schema_root: string;
    readonly instruction_root: string;
    readonly tooling_root: string;
  };
  readonly control: {
    readonly work_root: string;
    readonly coordination_ledger: string;
    readonly checkpoint_name: string;
  };
  readonly paths: PathProfileConfig;
  readonly projects: readonly ProjectConfig[];
  readonly agents: {
    readonly profiles: Readonly<Record<string, AgentRoleProfile>>;
    readonly role_instructions: Readonly<
      Record<
        string,
        {
          readonly description: string;
          readonly consumes: readonly string[];
          readonly produces: readonly string[];
          readonly rules: readonly string[];
        }
      >
    >;
    readonly tool_policies: Readonly<
      Record<string, { readonly source_write: boolean; readonly allowed_tools: readonly string[] }>
    >;
    readonly egress_policies: Readonly<Record<string, { readonly allowed_hosts: readonly string[] }>>;
  };
  readonly teams: Readonly<
    Record<
      string,
      {
        readonly enabled: boolean;
        readonly default_workflow: string;
        readonly allowed_projects: readonly string[];
        readonly allowed_work_item_kinds: readonly WorkItemKind[];
        readonly roles: Readonly<Record<string, string>>;
        readonly stage_overrides: Readonly<Record<string, string>>;
      }
    >
  >;
  readonly work_items: {
    readonly types: Readonly<Record<string, true>>;
    readonly provider_mappings: readonly {
      readonly provider: string;
      readonly provider_type: string;
      readonly canonical_kind: WorkItemKind;
    }[];
  };
  readonly workflows: Readonly<Record<string, WorkflowDefinition>>;
  readonly workflow_bindings: readonly WorkflowBinding[];
  readonly artifact_contracts: Readonly<
    Record<string, { readonly schema: string; readonly required_fields: readonly string[] }>
  >;
  readonly research_decision: ResearchDecisionConfig;
  readonly knowledge: {
    readonly sources: readonly {
      readonly id: string;
      readonly kind: 'official' | 'local';
      readonly location: string;
      readonly title: string;
    }[];
  };
  readonly authorization: {
    readonly cedar: {
      readonly policy: string;
      readonly schema_text: string;
    };
  };
  readonly governance: {
    readonly edictum: {
      readonly policy_version: string;
      readonly workflow_id: string;
      readonly tool_allowlist: readonly string[];
      readonly limits: {
        readonly max_attempts: number;
        readonly max_tool_calls: number;
        readonly max_calls_per_tool: Readonly<Record<string, number>>;
      };
      readonly approval: {
        readonly clock_skew_ms: number;
        readonly max_age_ms: number;
      };
      readonly evidence: { readonly required_stages: readonly string[] };
      readonly sandbox: { readonly allowlist: readonly string[] };
      readonly workflow: {
        readonly stages: readonly {
          readonly id: string;
          readonly tools: readonly string[];
          readonly approval_required: boolean;
          readonly require_result: boolean;
        }[];
      };
    };
  };
  readonly orchestration: {
    readonly mastra: {
      readonly default_profile: string;
      readonly workflow_allowlist: readonly string[];
      readonly tool_allowlist: readonly string[];
      readonly egress_allowlist: readonly string[];
      readonly hitl: { readonly enabled: boolean; readonly approval_required_for: readonly string[] };
    };
  };
  readonly operations: {
    readonly registry: readonly {
      readonly id: string;
      readonly profile: string;
      readonly tool: string;
      readonly governance_stage: string;
      readonly evidence_class: 'Decision' | 'Code' | 'Static' | 'Runtime';
    }[];
  };
  readonly verification: {
    readonly differential: {
      readonly enabled: boolean;
      readonly required_oracle_digests: number;
      readonly execution: {
        readonly executor: 'bun';
        readonly operation_timeout_ms: number;
        readonly worker_output_bytes: number;
      };
      readonly oracle: { readonly module: string; readonly authority: 'non_executor_reference' };
      readonly candidate: { readonly module: string; readonly allowed_exports: readonly string[] };
      readonly cases: readonly {
        readonly case_id: string;
        readonly operation: string;
        readonly candidate_export: string;
        readonly oracle_export: string;
      }[];
    };
  };
  readonly observability: {
    readonly max_error_log_bytes: number;
    readonly redact_fields: readonly string[];
  };
  readonly timing: { readonly threshold_ms: number; readonly optimization_reason: string };
}

export class RuntimeConfigError extends Error {
  readonly code = 'GAP-RUNTIME-CONFIG-001';

  constructor(message: string) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

type AjvConstructor = new (options?: Record<string, unknown>) => {
  compile(schema: object): ((value: unknown) => boolean) & { errors?: ErrorObject[] | null };
};
const Ajv2020Constructor = Ajv2020 as unknown as AjvConstructor;
type ConfigValidator = ((value: unknown) => boolean) & { errors?: ErrorObject[] | null };
type JsonSnapshot = null | string | boolean | number | JsonSnapshot[] | { [key: string]: JsonSnapshot };

function choose<T>(condition: boolean, whenTrue: () => T, whenFalse: () => T): T {
  return [whenFalse, whenTrue][Number(condition)]!();
}

function assertCondition(condition: boolean, message: string): void {
  choose(
    condition,
    () => undefined,
    () => {
      throw new RuntimeConfigError(message);
    },
  );
}

function mapValue<T>(map: Map<string, T>, key: string, defaultValue: T): T {
  return [defaultValue, map.get(key) as T][Number(map.has(key))]!;
}

function listOrEmpty<T>(value: readonly T[] | null | undefined): readonly T[] {
  return [[], value as readonly T[]][Number(Boolean(value))]!;
}

function denseIndex(key: PropertyKey, length: number): boolean {
  const text = String(key);
  const canonical = /^(0|[1-9][0-9]*)$/.test(text);
  return [false, [false, Number(text) < length][Number(canonical)]!][Number(typeof key === 'string')]!;
}

function yamlText(value: unknown): boolean {
  return [false, String(value).length > 0][Number(typeof value === 'string')]!;
}

function yamlMergeItem(item: unknown): boolean {
  const record = [{}, item][Number(isYamlObject(item))] as Record<string, unknown>;
  const key = [{}, record.key][Number(isYamlObject(record.key))] as Record<string, unknown>;
  return key.value === '<<';
}

const OPAQUE_SECRET_REFERENCE = new RegExp('^secret://[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$');
const SENSITIVE_CONFIG_KEY = /(?:password|passphrase|secret|token|api_?key|credential)/i;
const SENSITIVE_LITERAL =
  /["']?(?:password|passphrase|secret|token|api[_-]?key|apikey|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["']?[^&\s,"'}]+/i;
const SENSITIVE_TOKEN_LITERAL =
  /\b(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|basic\s+[A-Za-z0-9+/]{8,}={0,2}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/i;
const SENSITIVE_URL_USERINFO = /https?:\/\/[^/\s:@]+:[^/\s@]+@/i;
function credentialLiteral(key: string, child: unknown): boolean {
  if (typeof child !== 'string') return false;
  return SENSITIVE_CONFIG_KEY.test(key)
    ? !OPAQUE_SECRET_REFERENCE.test(child)
    : SENSITIVE_LITERAL.test(child) || SENSITIVE_TOKEN_LITERAL.test(child) || SENSITIVE_URL_USERINFO.test(child);
}

function cacheMatches(cached: CachedConfig | undefined, digest: string): boolean {
  return [Boolean(cached), cached?.bytes_sha256 === digest].every(Boolean);
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  const safeList = listOrEmpty(errors);
  return safeList
    .map(
      (error) =>
        ['/', error.instancePath as string][Number(Boolean(error.instancePath))]! +
        ' ' +
        ['invalid', error.message as string][Number(Boolean(error.message))]!,
    )
    .join('; ');
}

function snapshotDescriptor(value: object, key: PropertyKey, label: string, enumerable = true): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  assertCondition(Boolean(descriptor), label + ' must contain own data properties');
  assertCondition(Object.hasOwn(descriptor as object, 'value'), label + ' must contain own data properties');
  assertCondition(
    [!enumerable, (descriptor as PropertyDescriptor).enumerable === true].some(Boolean),
    label + ' must contain own data properties',
  );
  return descriptor as PropertyDescriptor;
}

function snapshotJson(value: unknown, label: string, seen: WeakSet<object>, state: { nodes: number }): JsonSnapshot {
  const kind = typeof value;
  return choose(
    value === null,
    () => null,
    () =>
      choose(
        ['string', 'boolean'].includes(kind),
        () => value as string | boolean,
        () =>
          choose(
            kind === 'number',
            () => {
              assertCondition(Number.isFinite(value), label + ' must contain finite numbers');
              return value as number;
            },
            () => {
              assertCondition(kind === 'object', label + ' must contain only JSON values');
              const objectValue = value as object;
              assertCondition(!seen.has(objectValue), label + ' contains a cycle or shared object');
              seen.add(objectValue);
              state.nodes += 1;
              assertCondition(state.nodes <= MAX_SNAPSHOT_NODES, 'runtime config exceeds the node budget');
              const result = choose<JsonSnapshot>(
                Array.isArray(objectValue),
                () => {
                  const length = snapshotDescriptor(objectValue, 'length', label + '.length', false).value;
                  assertCondition(Number.isSafeInteger(length), label + ' has an invalid length');
                  assertCondition((length as number) >= 0, label + ' has an invalid length');
                  const keys = Reflect.ownKeys(objectValue);
                  const validIndexes = keys
                    .filter((key) => key !== 'length')
                    .every((key) => denseIndex(key, length as number));
                  assertCondition(
                    keys.length === (length as number) + 1,
                    label + ' must be a dense array without extra properties',
                  );
                  assertCondition(keys.includes('length'), label + ' must be a dense array without extra properties');
                  assertCondition(validIndexes, label + ' must be a dense array without extra properties');
                  return Array.from({ length: length as number }, (_, index) =>
                    snapshotJson(
                      snapshotDescriptor(objectValue, String(index), label + '[' + index + ']').value,
                      label + '[' + index + ']',
                      seen,
                      state,
                    ),
                  );
                },
                () => {
                  assertCondition(isPlainRecord(objectValue), label + ' must be a plain object');
                  const resultObject: Record<string, JsonSnapshot> = Object.create(null) as Record<
                    string,
                    JsonSnapshot
                  >;
                  Reflect.ownKeys(objectValue).forEach((key) => {
                    assertCondition(typeof key === 'string', label + ' contains a symbol key');
                    const textKey = key as string;
                    Object.defineProperty(resultObject, textKey, {
                      configurable: true,
                      enumerable: true,
                      writable: true,
                      value: snapshotJson(
                        snapshotDescriptor(objectValue, textKey, label + '.' + textKey).value,
                        label + '.' + textKey,
                        seen,
                        state,
                      ),
                    });
                  });
                  return resultObject;
                },
              );
              seen.delete(objectValue);
              return result as JsonSnapshot;
            },
          ),
      ),
  );
}

export function snapshotRuntimeConfig(value: unknown): unknown {
  return freezeJsonValue(snapshotJson(value, 'runtime config', new WeakSet<object>(), { nodes: 0 }));
}

function assertRelativeSafe(value: string, label: string): void {
  const parts = value.split('/');
  const unsafe = [
    !value,
    /\p{Cc}/u.test(value),
    /[<>"|?*]/.test(value),
    path.isAbsolute(value),
    value.includes('\\'),
    /^[A-Za-z]:/.test(value),
    parts.some((part) => part.includes(':')),
  ].some(Boolean);
  assertCondition(!unsafe, label + ' must be repository-relative');
  const unsafeSegments = parts.some((part) =>
    [
      part === '',
      part === '..',
      choose(
        part === '.',
        () => value !== '.',
        () => false,
      ),
    ].some(Boolean),
  );
  assertCondition(!unsafeSegments, label + ' contains an unsafe path segment');
  const ambiguous = [
    value !== '.',
    parts.some((part) =>
      [
        part.startsWith('..'),
        /[. ]$/.test(part),
        /~[0-9]+(?:[.][^/]*)?$/i.test(part),
        /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i.test(part),
      ].some(Boolean),
    ),
  ].every(Boolean);
  assertCondition(!ambiguous, label + ' contains a normalization-ambiguous segment');
}

export function resolveConfigPath(repositoryRoot: string, relativePath: string, label = 'config path'): string {
  assertRelativeSafe(relativePath, label);
  const root = path.resolve(repositoryRoot);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  const escapes = [relative === '..', relative.startsWith('..' + path.sep), path.isAbsolute(relative)].some(Boolean);
  assertCondition(!escapes, label + ' escapes repository root');
  return target;
}

function assertRegularSchemaFile(file: string): string {
  const stat = lstatSync(file);
  const invalid = [!stat.isFile(), stat.isSymbolicLink(), stat.size <= 0, stat.size > MAX_CONFIG_BYTES].some(Boolean);
  assertCondition(!invalid, 'runtime config schema identity is invalid');
  const raw = readFileSync(file, 'utf8');
  assertCondition(
    createHash('sha256').update(raw, 'utf8').digest('hex') === CONFIG_SCHEMA_SHA256,
    'runtime config schema content is not canonical',
  );
  return raw;
}

function isYamlObject(value: unknown): boolean {
  return [typeof value === 'object', value !== null, !Array.isArray(value)].every(Boolean);
}

function yamlNodeChildren(node: Record<string, unknown>): readonly unknown[] {
  const items = [[], node.items as unknown[]][Number(Array.isArray(node.items))]!;
  return items.flatMap((item) => {
    const object = isYamlObject(item);
    const record = [{}, item as Record<string, unknown>][Number(object)]!;
    const values = Object.keys(record)
      .filter((key) => ['key', 'value'].includes(key))
      .map((key) => record[key]);
    return [[item], values][Number([object, values.length > 0].every(Boolean))]!;
  });
}

function assertSafeYamlNode(node: unknown, seen = new WeakSet<object>()): void {
  choose(
    isYamlObject(node),
    () => {
      const record = node as Record<string, unknown>;
      assertCondition(!seen.has(node as object), 'runtime YAML contains a cycle or alias');
      seen.add(node as object);
      const constructorName = Object.getPrototypeOf(node)?.constructor?.name;
      assertCondition(
        ![constructorName === 'Alias', record.type === 'ALIAS'].some(Boolean),
        'runtime YAML aliases are forbidden',
      );
      assertCondition(!yamlText(record.anchor), 'runtime YAML anchors are forbidden');
      assertCondition(!yamlText(record.tag), 'runtime YAML explicit/custom tags are forbidden');
      const items = record.items;
      const merge = choose(
        Array.isArray(items),
        () => (items as unknown[]).some((item) => yamlMergeItem(item)),
        () => false,
      );
      assertCondition(!merge, 'runtime YAML merge keys are forbidden');
      yamlNodeChildren(record).forEach((child) => assertSafeYamlNode(child, seen));
      seen.delete(node as object);
    },
    () => undefined,
  );
}

function parseYaml(raw: string): unknown {
  assertCondition(Buffer.byteLength(raw, 'utf8') <= MAX_CONFIG_BYTES, 'runtime YAML is too large');
  const document = parseDocument(raw, {
    schema: 'core',
    uniqueKeys: true,
    merge: false,
    prettyErrors: false,
    strict: true,
  });
  const issues = [...document.errors, ...document.warnings].map((issue) => issue.message).join('; ');
  assertCondition(issues.length === 0, 'runtime YAML parse failed: ' + issues);
  assertSafeYamlNode(document.contents);
  return document.toJS({ maxAliasCount: 0, mapAsMap: false });
}

let schemaValidator: ConfigValidator | undefined;
function validator(): ConfigValidator {
  return choose(
    Boolean(schemaValidator),
    () => schemaValidator as ConfigValidator,
    () => {
      const schema = parseYaml(assertRegularSchemaFile(CONFIG_SCHEMA_FILE));
      assertCondition(isYamlObject(schema), 'runtime config schema identity is not canonical');
      assertCondition(Object.hasOwn(schema as object, '$id'), 'runtime config schema identity is not canonical');
      assertCondition(
        (schema as { $id?: unknown }).$id === CONFIG_SCHEMA_ID,
        'runtime config schema identity is not canonical',
      );
      const ajv = new Ajv2020Constructor({ strict: true, allErrors: true, ownProperties: true });
      schemaValidator = ajv.compile(schema as object) as ConfigValidator;
      return schemaValidator;
    },
  );
}

function assertUnique(values: readonly string[], label: string): void {
  assertCondition(new Set(values).size === values.length, label + ' contains duplicates');
}

function assertConfiguredPaths(config: AgentRuntimeConfig): void {
  const base: [string, string][] = [
    [config.repository.sidecar, 'repository sidecar'],
    [config.repository.policy, 'repository policy'],
    [config.runtime.bundle, 'runtime bundle'],
    [config.runtime.schema_root, 'runtime schema root'],
    [config.runtime.instruction_root, 'runtime instruction root'],
    [config.runtime.tooling_root, 'runtime tooling root'],
    [config.control.work_root, 'control work root'],
    [config.control.coordination_ledger, 'coordination ledger'],
    ...Object.entries(config.paths.defaults).map(([key, value]) => [value, 'path default ' + key] as [string, string]),
    [config.research_decision.paths.research_records, 'research records path'],
    [config.research_decision.paths.decision_records, 'decision records path'],
    [config.research_decision.paths.changelog, 'research decision changelog path'],
    [config.research_decision.paths.cache, 'research decision cache path'],
    [config.research_decision.paths.activation_history, 'activation history path'],
  ];
  const markerPaths = config.repository.root_markers.map(
    (marker) => [marker, 'repository marker ' + marker] as [string, string],
  );
  const repositoryPaths: [string, string][] = [[config.repository.project_root, 'repository project root']];
  const projectPaths = config.projects.flatMap((project) => {
    const overrideSource = [{}, project.path_overrides as PathProfileOverride][
      Number(Boolean(project.path_overrides))
    ]!;
    const overrides = Object.entries(overrideSource)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, value]) => [value, 'project ' + project.project_id + ' path override ' + key] as [string, string]);
    return [
      [project.project_root, 'project ' + project.project_id + ' root'],
      [project.wiki_root, 'project ' + project.project_id + ' wiki root'],
      [project.wiki_path, 'project ' + project.project_id + ' wiki path'],
      [project.wiki_output_root, 'project ' + project.project_id + ' wiki output root'],
      [project.internal_root, 'project ' + project.project_id + ' internal root'],
      [project.ledger_root, 'project ' + project.project_id + ' ledger root'],
      ...overrides,
    ] as [string, string][];
  });
  const knowledgePaths = config.knowledge.sources.flatMap((source) =>
    choose(
      source.kind === 'local',
      () => [[source.location, 'knowledge source ' + source.id]] as [string, string][],
      () => {
        assertCondition(/^https:\/\//.test(source.location), 'knowledge source ' + source.id + ' is not HTTPS');
        return [] as [string, string][];
      },
    ),
  );
  [...base, ...markerPaths, ...repositoryPaths, ...projectPaths, ...knowledgePaths].forEach(([value, label]) =>
    assertRelativeSafe(value, label),
  );
}

function assertRequiredRepositoryReferences(config: AgentRuntimeConfig, repositoryRoot: string): void {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  config.repository.root_markers.forEach((value) => {
    const target = resolveConfigPath(repositoryRoot, value, 'required marker ' + value);
    assertCondition(
      access.fileExists(target, 'required marker ' + value),
      'required reference ' + value + ' is unavailable',
    );
  });
  const files = [
    config.repository.sidecar,
    config.repository.policy,
    ...config.knowledge.sources.filter((source) => source.kind === 'local').map((source) => source.location),
  ];
  files.forEach((value) => {
    const packagePrefix = config.runtime.bundle + '/';
    if (value.startsWith(packagePrefix))
      runtimePackageAccess().readText(value.slice(packagePrefix.length), 'required package reference ' + value);
    else {
      const target = resolveConfigPath(repositoryRoot, value, 'required reference ' + value);
      access.readText(target, 'required reference ' + value);
    }
  });
}

function assertNoLiteralCredentials(value: unknown, pointer = '$'): void {
  choose(
    Array.isArray(value),
    () => (value as unknown[]).forEach((item, index) => assertNoLiteralCredentials(item, pointer + '[' + index + ']')),
    () =>
      choose(
        isYamlObject(value),
        () =>
          Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
            const literal = credentialLiteral(key, child);
            assertCondition(!literal, pointer + '.' + key + ' must be an opaque secret reference');
            assertNoLiteralCredentials(child, pointer + '.' + key);
          }),
        () => undefined,
      ),
  );
}

function assertAgentReferences(config: AgentRuntimeConfig): void {
  const profiles = config.agents.profiles;
  Object.entries(profiles).forEach(([profileId, profile]) => {
    assertCondition(
      Object.hasOwn(config.agents.tool_policies, profile.tools_policy),
      'profile ' + profileId + ' uses an unknown tool policy',
    );
    assertCondition(
      Object.hasOwn(config.agents.egress_policies, profile.egress_policy),
      'profile ' + profileId + ' uses an unknown egress policy',
    );
    const policy = config.agents.tool_policies[profile.tools_policy]!;
    assertCondition(Boolean(policy), 'profile ' + profileId + ' uses an unknown tool policy');
    assertCondition(
      (profile.mutation_scope === 'repository_source') === policy.source_write,
      'profile ' + profileId + ' mutation scope and tool policy diverge',
    );
    assertCondition(
      profile.mutation_scope === 'repository_source' || !hasSourceWriteTool(policy.allowed_tools),
      'profile ' + profileId + ' exposes source-write tools outside the developer scope',
    );
    policy.allowed_tools.forEach((tool) =>
      assertCondition(
        config.orchestration.mastra.tool_allowlist.includes(tool),
        'profile ' + profileId + ' uses a tool outside the Mastra allowlist',
      ),
    );
  });
  assertCondition(profiles.researcher?.model === 'gpt-6-luna', 'researcher model must be gpt-6-luna');
  ['researcher', 'web-researcher', 'codebase-mapper'].forEach((id) => {
    const profile = profiles[id];
    assertCondition(Boolean(profile), 'research profile ' + id + ' must use gpt-6-luna/xhigh/fast');
    assertCondition(profile?.model === 'gpt-6-luna', 'research profile ' + id + ' must use gpt-6-luna/xhigh/fast');
    assertCondition(profile?.reasoning === 'xhigh', 'research profile ' + id + ' must use gpt-6-luna/xhigh/fast');
    assertCondition(profile?.execution_mode === 'fast', 'research profile ' + id + ' must use gpt-6-luna/xhigh/fast');
    assertCondition(profile?.mutation_scope === 'none', 'research profile ' + id + ' must be read-only');
  });
}

function topologicalStages(workflowId: string, workflow: WorkflowDefinition): readonly WorkflowStage[] {
  const byId = new Map(workflow.stages.map((stage) => [stage.id, stage]));
  assertCondition(byId.size === workflow.stages.length, 'workflow ' + workflowId + ' has duplicate stages');
  assertCondition(byId.has(workflow.entry_stage), 'workflow ' + workflowId + ' entry stage is missing');
  assertUnique(workflow.terminal_stages, 'workflow ' + workflowId + ' terminals');
  assertCondition(
    !workflow.terminal_stages.some((stage) => !byId.has(stage)),
    'workflow ' + workflowId + ' terminal stage is missing',
  );
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  byId.forEach((_stage, id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });
  workflow.edges.forEach(([from, to]) => {
    assertCondition(byId.has(from), 'workflow ' + workflowId + ' has an invalid edge');
    assertCondition(byId.has(to), 'workflow ' + workflowId + ' has an invalid edge');
    assertCondition(from !== to, 'workflow ' + workflowId + ' has an invalid edge');
    assertCondition(!mapValue(outgoing, from, []).includes(to), 'workflow ' + workflowId + ' has a duplicate edge');
    mapValue(outgoing, from, []).push(to);
    mapValue(incoming, to, []).push(from);
  });
  assertCondition(
    mapValue(incoming, workflow.entry_stage, []).length === 0,
    'workflow ' + workflowId + ' entry has an incoming edge',
  );
  workflow.terminal_stages.forEach((terminal) =>
    assertCondition(
      mapValue(outgoing, terminal, []).length === 0,
      'workflow ' + workflowId + ' terminal has an outgoing edge',
    ),
  );
  workflow.stages.forEach((stage) => {
    assertUnique(stage.required_after, 'workflow ' + workflowId + ' stage ' + stage.id + ' prerequisites');
    const predecessors = mapValue(incoming, stage.id, []);
    const match = [
      predecessors.length === stage.required_after.length,
      stage.required_after.every((required) => predecessors.includes(required)),
    ].every(Boolean);
    assertCondition(match, 'workflow ' + workflowId + ' stage ' + stage.id + ' prerequisites do not match edges');
  });
  const indegree = new Map([...incoming].map(([id, values]) => [id, values.length]));
  const queue = [workflow.entry_stage];
  const ordered: WorkflowStage[] = [];
  const visit = (): void =>
    choose(
      queue.length > 0,
      () => {
        const id = queue.shift() as string;
        const stage = byId.get(id);
        assertCondition(Boolean(stage), 'workflow ' + workflowId + ' stage is missing');
        ordered.push(stage as WorkflowStage);
        mapValue(outgoing, id, []).forEach((next) => {
          const value = mapValue(indegree, next, 0) - 1;
          indegree.set(next, value);
          queue.push(...[[], [next]][Number(value === 0)]!);
        });
        visit();
      },
      () => undefined,
    );
  visit();
  assertCondition(
    ordered.length === workflow.stages.length,
    'workflow ' + workflowId + ' is cyclic or has unreachable stages',
  );
  return ordered;
}

function assertWorkflowArtifacts(
  config: AgentRuntimeConfig,
  workflowId: string,
  stages: readonly WorkflowStage[],
): void {
  const available = new Set(['WorkItem/v1']);
  const ancestors = new Map<string, Set<string>>();
  const producers = new Map<string, string[]>();
  stages.forEach((stage) => {
    [...stage.consumes, ...stage.produces].forEach((artifact) =>
      assertCondition(
        Object.hasOwn(config.artifact_contracts, artifact),
        'workflow ' + workflowId + ' uses unknown artifact ' + artifact,
      ),
    );
    const stageAncestors = new Set<string>();
    stage.required_after.forEach((predecessor) => {
      stageAncestors.add(predecessor);
      ancestors.get(predecessor)?.forEach((ancestor) => stageAncestors.add(ancestor));
    });
    ancestors.set(stage.id, stageAncestors);
    stage.produces.forEach((artifact) => {
      const artifactProducers = producers.get(artifact) ?? [];
      artifactProducers.push(stage.id);
      producers.set(artifact, artifactProducers);
    });
    stage.consumes.forEach((artifact) =>
      assertCondition(
        available.has(artifact),
        'workflow ' + workflowId + ' consumes ' + artifact + ' before it is produced',
      ),
    );
    stage.consumes
      .filter((artifact) => artifact !== 'WorkItem/v1')
      .forEach((artifact) => {
        const causalProducer = (producers.get(artifact) ?? []).some((producer) => stageAncestors.has(producer));
        assertCondition(
          causalProducer,
          'workflow ' + workflowId + ' consumes ' + artifact + ' without a causal producer',
        );
      });
    stage.produces.forEach((artifact) => available.add(artifact));
  });
}

function assertWorkflowAssignments(config: AgentRuntimeConfig, workflowId: string, workflow: WorkflowDefinition): void {
  const develops = workflow.stages.filter((stage) => stage.kind === 'develop');
  assertCondition(
    !workflow.stages.some(
      (stage) =>
        stage.kind !== 'develop' &&
        stage.assignments.some((assignment) => assignment.role === 'developer-orchestrator'),
    ),
    'workflow ' + workflowId + ' restricts developer-orchestrator to develop stage',
  );
  choose(
    workflow.assurance_profile === 'research_light',
    () => {
      assertCondition(
        !workflow.stages.some((stage) => !['research', 'synthesize'].includes(stage.kind)),
        'research workflow ' + workflowId + ' contains a mutation or delivery stage',
      );
    },
    () => {
      assertCondition(develops.length === 1, 'code workflow ' + workflowId + ' must have one develop stage');
      const develop = develops[0]!;
      assertCondition(
        develop.assignments.length === 1 && develop.assignments[0]?.role === 'developer-orchestrator',
        'code workflow ' + workflowId + ' develop stage must have exactly one developer-orchestrator assignment',
      );
    },
  );
  workflow.stages.forEach((stage) =>
    stage.assignments.forEach((assignment) => {
      const profile = config.agents.profiles[assignment.profile];
      assertCondition(Boolean(profile), 'workflow ' + workflowId + ' uses unknown profile ' + assignment.profile);
      const policy = profile ? config.agents.tool_policies[profile.tools_policy] : undefined;
      const hasSourceWrite = Boolean(policy && hasSourceWriteTool(policy.allowed_tools));
      const instruction = config.agents.role_instructions[assignment.role];
      assertCondition(
        Boolean(instruction),
        'workflow ' + workflowId + ' role ' + assignment.role + ' has no instruction',
      );
      assertCondition(
        !stage.consumes.some((artifact) => !(instruction?.consumes.includes(artifact) as boolean)),
        'workflow ' + workflowId + ' role ' + assignment.role + ' cannot consume its stage artifacts',
      );
      assertCondition(
        !stage.produces.some((artifact) => !(instruction?.produces.includes(artifact) as boolean)),
        'workflow ' + workflowId + ' role ' + assignment.role + ' cannot produce its stage artifacts',
      );
      const mayWrite = [stage.kind === 'develop', assignment.role === 'developer-orchestrator'].every(Boolean);
      choose(
        mayWrite,
        () =>
          assertCondition(
            profile?.mutation_scope === 'repository_source',
            'workflow ' + workflowId + ' developer is not source-write capable',
          ),
        () => {
          assertCondition(
            profile?.mutation_scope === 'none',
            'workflow ' + workflowId + ' grants source mutation outside developer-orchestrator/develop',
          );
          assertCondition(
            !hasSourceWrite,
            'workflow ' + workflowId + ' grants source-write tools outside developer-orchestrator/develop',
          );
        },
      );
      choose(
        stage.kind === 'research',
        () =>
          assertCondition(
            Boolean(assignment.contour),
            'workflow ' + workflowId + ' research assignment has no contour',
          ),
        () => assertCondition(!assignment.contour, 'workflow ' + workflowId + ' non-research assignment has a contour'),
      );
    }),
  );
}

function assertWorkflowReferences(config: AgentRuntimeConfig): void {
  const implementedArtifactFields: Readonly<Record<string, readonly string[]>> = {
    'ResearchResult/v1': researchResultSchema.required,
    'ResearchSynthesis/v1': researchSynthesisSchema.required,
    'DevelopmentTaskPacket/v1': [
      'schema',
      'packet_id',
      'work_item_id',
      'team_id',
      'workflow_id',
      'work_item',
      'attempt',
      'risk_flags',
      'objective',
      'acceptance',
      'in_scope',
      'out_of_scope',
      'owned_paths',
      'affected_symbols',
      'skill_refs',
      'documentation_refs',
      'code_evidence_refs',
      'research_artifact_refs',
      'diagnostics',
      'failed_approaches',
      'prohibited_patterns',
      'implementation_constraints',
      'security_constraints',
      'expected_tests',
      'delivery_conditions',
      'source_revision',
      'lease_expires_at',
      'digest',
    ],
    'FailureArtifact/v1': [
      'schema',
      'failure_id',
      'packet_id',
      'stage_id',
      'agent_role',
      'attempt',
      'error_class',
      'log_refs',
      'broken_acceptance',
      'failed_approach_fingerprint',
      'retryable',
      'next_route',
      'sanitized_message',
    ],
    'ValidationReceipt/v1': [
      'schema',
      'receipt_id',
      'packet_id',
      'packet_digest',
      'implementation_fingerprint',
      'validator_role',
      'verdict',
      'findings',
      'evidence_refs',
    ],
    'TesterInstruction/v1': [
      'schema',
      'instruction_id',
      'packet_id',
      'packet_digest',
      'implementation_fingerprint',
      'expected_tests',
      'digest',
    ],
    'TestReceipt/v1': [
      'schema',
      'receipt_id',
      'instruction_id',
      'packet_id',
      'packet_digest',
      'implementation_fingerprint',
      'status',
      'evidence_refs',
    ],
    'DeliveryInstruction/v1': [
      'schema',
      'instruction_id',
      'packet_id',
      'packet_digest',
      'implementation_fingerprint',
      'created',
      'modified',
      'deploy',
      'do_not_deploy',
      'destination',
      'order',
      'post_deployment_checks',
      'digest',
    ],
  };
  Object.entries(config.artifact_contracts).forEach(([artifactId, contract]) => {
    assertCondition(
      artifactId !== 'ResearchArtifact/v1' && artifactId !== 'ResearchBundle/v1',
      'artifact contract ' + artifactId + ' has no executable boundary; reconcile to current research contracts',
    );
    assertCondition(contract.schema === artifactId, 'artifact contract ' + artifactId + ' is not a final v1 contract');
    assertCondition(artifactId.endsWith('/v1'), 'artifact contract ' + artifactId + ' is not a final v1 contract');
    assertUnique(contract.required_fields, 'artifact contract ' + artifactId + ' required fields');
    const implementationFields = implementedArtifactFields[artifactId];
    if (implementationFields) {
      const configuredFields = [...contract.required_fields].sort().join('\u0000');
      const expectedFields = [...implementationFields].sort().join('\u0000');
      assertCondition(
        configuredFields === expectedFields,
        'artifact contract ' + artifactId + ' does not match its implemented boundary',
      );
    }
  });
  Object.entries(config.workflows).forEach(([workflowId, workflow]) => {
    const ordered = topologicalStages(workflowId, workflow);
    for (const stage of ordered) {
      const sourceIds = stage.context_source_ids ?? [];
      const skillRefs = stage.context_skill_refs ?? [];
      assertUnique(sourceIds, 'workflow ' + workflowId + ' stage ' + stage.id + ' context source ids');
      assertUnique(skillRefs, 'workflow ' + workflowId + ' stage ' + stage.id + ' context skill refs');
      assertCondition(
        sourceIds.length + skillRefs.length <= 16,
        'workflow ' + workflowId + ' stage ' + stage.id + ' context selection is too large',
      );
      for (const sourceId of sourceIds)
        assertCondition(
          config.knowledge.sources.filter((source) => source.id === sourceId).length === 1,
          'workflow ' + workflowId + ' stage ' + stage.id + ' has an unknown context source',
        );
      for (const skillRef of skillRefs)
        assertCondition(
          /^\.codex\/skills\/[A-Za-z0-9._-]+\/SKILL\.md$/.test(skillRef) && !skillRef.includes('..'),
          'workflow ' + workflowId + ' stage ' + stage.id + ' has an unsafe context skill ref',
        );
    }
    assertWorkflowAssignments(config, workflowId, workflow);
    assertWorkflowArtifacts(config, workflowId, ordered);
    if (workflow.assurance_profile !== 'research_light') {
      const position = (kind: WorkflowStageKind): number => ordered.findIndex((stage) => stage.kind === kind);
      const develop = position('develop');
      const test = position('test');
      const deliver = position('deliver');
      const configuredPrewriter = ordered.find((stage) => stage.id === 'review_source_prewrite');
      const developer = ordered[develop];
      const prewriterRiskFlags = ['security', 'data_loss', 'migration', 'high'];
      const isReadOnlyPrewriter = (stage: WorkflowStage): boolean => {
        const sourcePlanner = stage.assignments.find((assignment) => assignment.role === 'source-planner');
        const securityPrewriter = stage.assignments.find((assignment) => assignment.role === 'security-prewriter');
        const stageRiskFlags = stage.risk_flags ?? [];
        const securityRiskFlags = securityPrewriter?.risk_flags ?? [];
        return [
          stage.kind === 'validate',
          stage.mode === 'parallel',
          stage.id === 'review_source_prewrite',
          stage.required_after.length === 1 && stage.required_after[0] === 'synthesize_task',
          stageRiskFlags.length === 0,
          stage.assignments.length === 2,
          stage.assignments[0]?.role === 'source-planner' &&
            stage.assignments[1]?.role === 'security-prewriter',
          sourcePlanner?.profile === 'architect' && !sourcePlanner.risk_flags?.length,
          securityPrewriter?.profile === 'reviewer-security',
          securityRiskFlags.length === prewriterRiskFlags.length &&
            prewriterRiskFlags.every((risk) => securityRiskFlags.includes(risk)),
          stage.consumes.length === 1 && stage.consumes[0] === 'DevelopmentTaskPacket/v1',
          stage.produces.length === 1 && stage.produces[0] === 'LifecyclePreparationObservation/v1',
          config.agents.profiles.architect?.mutation_scope === 'none',
          config.agents.profiles.architect?.tools_policy === 'read_only',
          config.agents.profiles['reviewer-security']?.mutation_scope === 'none',
          Boolean(developer?.required_after.length === 1 && developer.required_after[0] === stage.id),
        ].every(Boolean);
      };
      const preDevelopmentValidators = ordered.filter((stage, index) => index < develop && stage.kind === 'validate');
      const postWriteValidate = ordered.findIndex(
        (stage, index) =>
          index > develop &&
          stage.kind === 'validate' &&
          stage.consumes.includes('DevelopmentTaskPacket/v1') &&
          stage.consumes.includes('ImplementationResult/v1') &&
          stage.produces.includes('ValidationReceipt/v1'),
      );
      const preDevelopmentValidatorsValid = configuredPrewriter
        ? preDevelopmentValidators.length === 1 &&
          preDevelopmentValidators[0] === configuredPrewriter &&
          isReadOnlyPrewriter(configuredPrewriter)
        : preDevelopmentValidators.length === 0;
      assertCondition(
        preDevelopmentValidatorsValid,
        'code workflow ' + workflowId + ' permits only the exact configured read-only source planner and risk-filtered security prewriter before development',
      );
      assertCondition(
        postWriteValidate >= 0 && test >= 0 && deliver >= 0,
        'code workflow ' + workflowId + ' must include post-write validation, test, and delivery stages',
      );
      assertCondition(
        develop < postWriteValidate &&
          develop < test &&
          postWriteValidate < deliver &&
          test < deliver,
        'code workflow ' + workflowId + ' must preserve post-write validation/test before delivery',
      );
      const stageMap = new Map(workflow.stages.map((stage) => [stage.id, stage]));
      assertCondition(
        workflow.terminal_stages.every((stageId) => stageMap.get(stageId)?.kind === 'deliver'),
        'code workflow ' + workflowId + ' terminal stages must be deliver stages',
      );
    }
    assertCondition(
      config.orchestration.mastra.workflow_allowlist.includes(workflowId),
      'workflow ' + workflowId + ' is outside the Mastra allowlist',
    );
  });
  config.orchestration.mastra.workflow_allowlist.forEach((allowed) =>
    assertCondition(Object.hasOwn(config.workflows, allowed), 'Mastra allows unknown workflow ' + allowed),
  );
}

function assertResearchDecisionConfiguration(config: AgentRuntimeConfig): void {
  const settings = config.research_decision;
  const registry = settings.registry;
  assertCondition(registry.schema === 'InstructionRegistry/v1', 'research decision registry identity is invalid');
  assertCondition(
    registry.instructions.length > 0 && registry.instructions.length <= 64,
    'research decision registry is empty or too large',
  );
  const instructionIds = new Set<string>();
  registry.instructions.forEach((instruction, index) => {
    assertCondition(
      !instructionIds.has(instruction.instruction_id),
      'research decision registry contains duplicate instruction',
    );
    instructionIds.add(instruction.instruction_id);
    assertCondition(
      instruction.source_path === 'agent-runtime.config.v1.yaml#research_decision.registry.instructions.' + index,
      'research decision instruction source binding is invalid',
    );
    const sourceDigest = createHash('sha256').update(instruction.content, 'utf8').digest('hex');
    const summaryDigest = createHash('sha256').update(instruction.content.slice(0, 512), 'utf8').digest('hex');
    assertCondition(sourceDigest === instruction.source_sha256, 'research decision instruction source digest is stale');
    assertCondition(
      summaryDigest === instruction.summary_sha256,
      'research decision instruction summary digest is stale',
    );
    assertCondition(
      Buffer.byteLength(instruction.content, 'utf8') <= instruction.max_bytes,
      'research decision instruction exceeds its bound',
    );
    assertCondition(
      instruction.max_bytes <= settings.limits.max_instruction_bytes,
      'research decision instruction exceeds configured limit',
    );
    assertCondition(!instruction.content.includes('/vida-'), 'research decision instruction contains a command alias');
  });
  const registryWithoutDigest = Object.fromEntries(Object.entries(registry).filter(([key]) => key !== 'digest'));
  assertCondition(
    canonicalJsonDigest(registryWithoutDigest) === registry.digest,
    'research decision registry digest is stale',
  );
}

function assertTeamsAndBindings(config: AgentRuntimeConfig): void {
  assertUnique(
    config.projects.map((project) => project.project_id),
    'project ids',
  );
  const projectIds = new Set([
    config.repository.repository_id,
    ...config.projects.map((project) => project.project_id),
  ]);
  const typeIds = new Set(Object.keys(config.work_items.types));
  const providerIds = new Set<string>();
  const providerProjects = new Set<string>();
  const providerNamespaces = new Set<string>();
  config.integrations.providers.forEach((provider) => {
    assertCondition(!providerIds.has(provider.id), 'integration provider id is duplicated');
    assertCondition(!providerProjects.has(provider.project_id), 'integration provider project is duplicated');
    assertCondition(!providerNamespaces.has(provider.namespace), 'integration provider namespace is duplicated');
    assertCondition(projectIds.has(provider.project_id), 'integration provider project is unknown');
    providerIds.add(provider.id);
    providerProjects.add(provider.project_id);
    providerNamespaces.add(provider.namespace);
  });
  config.projects.forEach((project) =>
    assertCondition(providerProjects.has(project.project_id), 'project integration binding is not configured'),
  );
  assertCondition(
    config.integrations.providers.length === config.projects.length,
    'integration providers must cover each configured project exactly once',
  );
  assertUnique(
    config.workflow_bindings.map((binding) => String(binding.priority)),
    'workflow binding priorities',
  );
  assertUnique(
    config.workflow_bindings.map((binding) => binding.id),
    'workflow binding ids',
  );
  Object.entries(config.teams).forEach(([teamId, team]) => {
    assertCondition(
      Object.hasOwn(config.workflows, team.default_workflow),
      'team ' + teamId + ' has an unknown default workflow',
    );
    team.allowed_projects.forEach((project) =>
      assertCondition(projectIds.has(project), 'team ' + teamId + ' has an unknown project'),
    );
    team.allowed_work_item_kinds.forEach((kind) =>
      assertCondition(typeIds.has(kind), 'team ' + teamId + ' has an unknown work item kind'),
    );
    Object.entries(team.roles).forEach(([role, profileId]) => {
      assertCondition(
        Object.hasOwn(config.agents.profiles, profileId),
        'team ' + teamId + ' role ' + role + ' has an unknown profile',
      );
      assertCondition(
        Object.hasOwn(config.agents.role_instructions, role),
        'team ' + teamId + ' role ' + role + ' has no configured instruction',
      );
    });
    Object.entries(team.stage_overrides).forEach(([stageId, profileId]) => {
      const stage = Object.values(config.workflows)
        .flatMap((workflow) => workflow.stages)
        .find((item) => item.id === stageId);
      const profile = config.agents.profiles[profileId];
      assertCondition(
        [Boolean(stage), Boolean(profile)].every(Boolean),
        'team ' + teamId + ' has an invalid stage override',
      );
      assertCondition(
        stage?.kind === 'develop',
        'team ' + teamId + ' stage override violates the developer-only mutation rule',
      );
      assertCondition(
        profile?.mutation_scope === 'repository_source',
        'team ' + teamId + ' stage override violates the developer-only mutation rule',
      );
    });
  });
  config.workflow_bindings.forEach((binding) => {
    assertCondition(
      Object.hasOwn(config.teams, binding.team),
      'workflow binding ' + binding.id + ' has an unknown team or workflow',
    );
    assertCondition(
      Object.hasOwn(config.workflows, binding.workflow),
      'workflow binding ' + binding.id + ' has an unknown team or workflow',
    );
    assertCondition(
      !binding.work_item_kinds.some((kind) => !typeIds.has(kind)),
      'workflow binding ' + binding.id + ' has an unknown work item kind',
    );
    assertCondition(
      !binding.projects.some((project) => [project !== '*', !projectIds.has(project)].every(Boolean)),
      'workflow binding ' + binding.id + ' has an unknown project',
    );
  });
  assertUnique(
    config.work_items.provider_mappings.map((mapping) => mapping.provider + '\\u0000' + mapping.provider_type),
    'work item provider mappings',
  );
  config.work_items.provider_mappings.forEach((mapping) =>
    assertCondition(typeIds.has(mapping.canonical_kind), 'work item provider mapping has an unknown canonical kind'),
  );
}

const supportedOperations = new Set([
  'readConfig',
  'readProjectContext',
  'selectWorkflow',
  'buildDevelopmentTaskPacket',
  'executeConfiguredWorkflow',
  'evaluateGovernance',
  'runGovernedWrite',
]);

function assertEmbeddedPolicies(config: AgentRuntimeConfig): void {
  const cedar = config.authorization.cedar;
  assertCondition(
    ![!cedar.policy.includes('permit'), !cedar.schema_text.includes('entity User')].some(Boolean),
    'embedded Cedar policy/schema is invalid',
  );
  const workflowStageIds = config.governance.edictum.workflow.stages.map((stage) => stage.id);
  assertUnique(workflowStageIds, 'Edictum workflow stages');
  assertCondition(
    !config.governance.edictum.evidence.required_stages.some((stage) => !workflowStageIds.includes(stage)),
    'Edictum evidence references an unknown stage',
  );
  config.operations.registry.forEach((operation) => {
    assertCondition(supportedOperations.has(operation.id), 'operation ' + operation.id + ' has no runtime consumer');
    assertCondition(
      Object.hasOwn(config.agents.profiles, operation.profile),
      'operation ' + operation.id + ' has an unknown profile',
    );
    assertCondition(
      config.orchestration.mastra.tool_allowlist.includes(operation.tool),
      'operation ' + operation.id + ' has an unknown tool',
    );
  });
  assertUnique(
    config.operations.registry.map((operation) => operation.id),
    'runtime operations',
  );
  assertCondition(
    config.verification.differential.required_oracle_digests === 2,
    'differential requires exactly two matching oracle digests',
  );
  assertRelativeSafe(config.verification.differential.oracle.module, 'differential oracle module');
}

export function validateWorkflowConfiguration(config: AgentRuntimeConfig): AgentRuntimeConfig {
  assertAgentReferences(config);
  assertWorkflowReferences(config);
  assertTeamsAndBindings(config);
  return config;
}

export function parseRuntimeConfigYaml(raw: string): AgentRuntimeConfig {
  return validateRuntimeConfig(parseYaml(raw));
}

export function validateRuntimeConfigRepairTargetBytes(bytes: Uint8Array, repositoryRoot: string): AgentRuntimeConfig {
  assertCondition(path.isAbsolute(repositoryRoot), 'runtime config repair root must be absolute');
  assertCondition(bytes.byteLength <= MAX_CONFIG_BYTES, 'runtime YAML is too large');
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  assertCondition(Buffer.from(raw, 'utf8').equals(Buffer.from(bytes)), 'runtime YAML bytes are not canonical UTF-8');
  return validateRuntimeConfig(parseYaml(raw), repositoryRoot);
}

export function validateRuntimeConfig(value: unknown, repositoryRoot?: string): AgentRuntimeConfig {
  const snapshot = snapshotRuntimeConfig(value);
  const validate = validator();
  assertCondition(validate(snapshot), 'runtime config validation failed: ' + formatAjvErrors(validate.errors));
  const config = snapshot as AgentRuntimeConfig;
  assertCondition(config.schema === 'AgentRuntimeConfig/v1', 'runtime config identity is invalid');
  assertCondition(config.version === 1, 'runtime config identity is invalid');
  assertConfiguredPaths(config);
  assertResearchDecisionConfiguration(config);
  assertNoLiteralCredentials(config);
  validateWorkflowConfiguration(config);
  assertEmbeddedPolicies(config);
  validateCandidateIsolation(config);
  choose(
    Boolean(repositoryRoot),
    () => assertRequiredRepositoryReferences(config, path.resolve(repositoryRoot as string)),
    () => undefined,
  );
  return config;
}

interface CachedConfig {
  readonly bytes_sha256: string;
  readonly config: AgentRuntimeConfig;
}
const configCache = new Map<string, CachedConfig>();
const authorizedRuntimeConfigs = new WeakSet<object>();
const authorizedRuntimeConfigRoots = new WeakMap<object, string>();
const loadedConfigDigests = new WeakMap<object, string>();

export function assertLoadedRuntimeConfig(config: AgentRuntimeConfig, repositoryRoot?: string): void {
  assertCondition(authorizedRuntimeConfigs.has(config), 'runtime config must come from loadRuntimeConfig');
  if (repositoryRoot !== undefined) {
    assertCondition(path.isAbsolute(repositoryRoot), 'runtime config root must be absolute');
    assertCondition(
      authorizedRuntimeConfigRoots.get(config) === path.resolve(repositoryRoot),
      'runtime config is not bound to the repository root',
    );
  }
}

export function loadRuntimeConfig(repositoryRoot: string): AgentRuntimeConfig {
  assertCondition(path.isAbsolute(repositoryRoot), 'repository root must be absolute');
  const root = path.resolve(repositoryRoot);
  const target = resolveConfigPath(root, CONFIG_FILE, 'runtime config');
  const raw = requireSafeRepositoryAccess(root).readText(target, 'runtime config');
  const bytesSha256 = createHash('sha256').update(raw, 'utf8').digest('hex');
  const cached = configCache.get(root);
  return choose(
    cacheMatches(cached, bytesSha256),
    () => (cached as CachedConfig).config,
    () => {
      const config = validateRuntimeConfig(parseYaml(raw), root);
      authorizedRuntimeConfigs.add(config);
      authorizedRuntimeConfigRoots.set(config, root);
      configCache.set(root, { bytes_sha256: bytesSha256, config });
      return config;
    },
  );
}

export function runtimeConfigDigest(config: AgentRuntimeConfig): string {
  if (!authorizedRuntimeConfigs.has(config)) return canonicalJsonDigest(config);
  // Loaded records have null prototypes; their frozen arrays retain this live hook check.
  canonicalJson([]);
  const existing = loadedConfigDigests.get(config);
  if (existing !== undefined) return existing;
  const digest = canonicalJsonDigest(config);
  loadedConfigDigests.set(config, digest);
  return digest;
}

export function resolveAgentRoleProfile(repositoryRoot: string, profileId: string): AgentRoleProfile {
  assertCondition(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(profileId), 'agent role profile id is invalid');
  const profile = loadRuntimeConfig(repositoryRoot).agents.profiles[profileId];
  assertCondition(Boolean(profile), 'agent role profile is not registered: ' + profileId);
  return profile as AgentRoleProfile;
}

export function resolveProviderWorkItemKind(
  config: AgentRuntimeConfig,
  provider: string,
  providerType: string,
): WorkItemKind {
  assertLoadedRuntimeConfig(config);
  const mapping = config.work_items.provider_mappings.find((item) =>
    [item.provider === provider, item.provider_type === providerType].every(Boolean),
  );
  assertCondition(Boolean(mapping), 'work item provider type is not registered: ' + provider + '/' + providerType);
  return (mapping as { canonical_kind: WorkItemKind }).canonical_kind;
}

function wildcardMatch(values: readonly string[], value: string): boolean {
  return [values.includes('*'), values.includes(value)].some(Boolean);
}
function validateWorkflowSelection(selection: unknown): asserts selection is WorkItemSelection {
  assertCondition(isPlainRecord(selection), 'workflow selection must be a plain object');
  const candidate = selection as Record<string, unknown>;
  const fields = ['team', 'kind', 'intent', 'project', 'risk_flags', 'labels'];
  assertCondition(
    Object.keys(candidate).length === fields.length && fields.every((field) => Object.hasOwn(candidate, field)),
    'workflow selection fields are invalid',
  );
  assertCondition(
    ['team', 'project'].every(
      (field) => typeof candidate[field] === 'string' && Boolean((candidate[field] as string).trim()),
    ),
    'workflow selection identity is invalid',
  );
  assertCondition(
    ['epic', 'feature', 'pbi', 'story', 'bug', 'task', 'research'].includes(candidate.kind as string),
    'workflow selection work item kind is invalid',
  );
  assertCondition(
    ['information_research', 'implementation_new', 'implementation_change', 'bug_fix', 'task_execution'].includes(
      candidate.intent as string,
    ),
    'workflow selection intent is invalid',
  );
  [candidate.risk_flags, candidate.labels].forEach((value, index) => {
    assertCondition(Array.isArray(value), 'workflow selection list ' + index + ' is invalid');
    const values = value as readonly unknown[];
    assertCondition(
      values.length <= 64 &&
        Array.from({ length: values.length }, (_, item) => item).every((item) => Object.hasOwn(values, item)),
      'workflow selection list ' + index + ' is invalid',
    );
    assertCondition(
      values.every((item) => typeof item === 'string' && Boolean(item.trim())),
      'workflow selection list ' + index + ' is invalid',
    );
    assertCondition(
      new Set(values).size === values.length,
      'workflow selection list ' + index + ' contains duplicates',
    );
  });
}
export function requireConfiguredOperation(
  config: AgentRuntimeConfig,
  id: string,
  tool: string,
  governanceStage: string,
  evidenceClass: AgentRuntimeConfig['operations']['registry'][number]['evidence_class'],
): AgentRuntimeConfig['operations']['registry'][number] {
  assertLoadedRuntimeConfig(config);
  const operation = config.operations.registry.find((entry) => entry.id === id);
  assertCondition(
    [
      operation?.tool === tool,
      operation?.governance_stage === governanceStage,
      operation?.evidence_class === evidenceClass,
    ].every(Boolean),
    'configured operation is unavailable: ' + id,
  );
  return operation!;
}

export function selectWorkflow(
  config: AgentRuntimeConfig,
  selection: WorkItemSelection,
): { readonly binding_id: string; readonly workflow_id: string; readonly workflow: WorkflowDefinition } {
  const operation = requireConfiguredOperation(config, 'selectWorkflow', 'runtime.read', 'read-evidence', 'Decision');
  assertCondition(
    operation.profile === config.orchestration.mastra.default_profile,
    'configured operation profile is unavailable: selectWorkflow',
  );
  validateWorkflowSelection(selection);
  const team = config.teams[selection.team];
  assertCondition(Boolean(team?.enabled), 'workflow selection team is unavailable');
  assertCondition(
    team!.allowed_projects.includes(selection.project),
    'workflow selection project is not allowed for the team',
  );
  assertCondition(
    team!.allowed_work_item_kinds.includes(selection.kind),
    'workflow selection work item kind is not allowed for the team',
  );
  const matches = [...config.workflow_bindings]
    .sort((left, right) => left.priority - right.priority)
    .filter((binding) => binding.team === selection.team)
    .filter((binding) => binding.work_item_kinds.includes(selection.kind))
    .filter((binding) => binding.intents.includes(selection.intent))
    .filter((binding) => wildcardMatch(binding.projects, selection.project))
    .filter((binding) =>
      [wildcardMatch(binding.risks, '*'), selection.risk_flags.some((risk) => binding.risks.includes(risk))].some(
        Boolean,
      ),
    )
    .filter((binding) => binding.labels.every((label) => selection.labels.includes(label)));
  const binding = matches[0];
  assertCondition(Boolean(binding), 'no configured workflow binding matches the work item');
  const workflow = config.workflows[(binding as WorkflowBinding).workflow];
  assertCondition(Boolean(workflow), 'selected workflow is not registered');
  return Object.freeze({
    binding_id: (binding as WorkflowBinding).id,
    workflow_id: (binding as WorkflowBinding).workflow,
    workflow: workflow as WorkflowDefinition,
  });
}

export function validateCandidateIsolation(config: AgentRuntimeConfig): void {
  const bundle = config.runtime.bundle;
  assertRelativeSafe(bundle, 'runtime bundle');
  assertCondition(bundle !== '.', candidateIsolationGap + ': runtime bundle must be a separate directory');
  const expectedRoots = [
    [config.runtime.schema_root, bundle + '/schemas'],
    [config.runtime.tooling_root, bundle + '/tooling'],
  ] as const;
  expectedRoots.forEach(([actual, expected]) =>
    assertCondition(actual === expected, candidateIsolationGap + ': runtime roots do not match the bundle'),
  );
  assertRelativeSafe(config.runtime.instruction_root, 'runtime instruction root');
  assertCondition(
    config.runtime.instruction_root === bundle || config.runtime.instruction_root.startsWith(bundle + '/'),
    candidateIsolationGap + ': runtime instructions must remain inside the bundle',
  );
}

export function validateConfiguredRepositoryAccess(repositoryRoot: string): SafeRepositoryAccess {
  const root = path.resolve(repositoryRoot);
  loadRuntimeConfig(root);
  return requireSafeRepositoryAccess(root);
}
