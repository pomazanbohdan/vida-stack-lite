import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import observedEventSchema from '../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
const ObservedEventAjv = Ajv2020 as unknown as new (options?: Record<string, unknown>) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validObservedResearchChangeEvent = new ObservedEventAjv({
  strict: true,
  allErrors: true,
  formats: { 'date-time': true },
}).compile(observedEventSchema);
import {
  loadRuntimeConfig,
  resolveConfigPath,
  runtimeConfigDigest,
  type AgentRuntimeConfig,
  type InstructionRegistry,
  type ResearchDecisionConfig,
  type ResearchDecisionInstruction,
} from './config/runtime-config.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from './config/safe-repository-access.js';
import { HostStateStore, type StateVersion, type WorkIdentity } from './host-state.js';
import { qualifiedResearchSourceCatalog, resolveQualifiedResearchSource } from './research-source-catalog.js';
import { parseSessionBridgeObservation, type SessionBridgeObservation } from './orchestration/mastra-session-bridge.js';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
  rfc3339TimestampMilliseconds,
} from './contracts/public-ingress.js';

const DIGEST = /^[a-f0-9]{64}$/;
const JSON_SCHEMA_URI = 'https://json-schema.org/draft/2020-12/schema';
const RESULT_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const USE_ID = /^[a-z0-9][a-z0-9._:-]{0,255}$/;
const SOURCE_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_DIRECTORY_ENTRIES = 4096;
const MAX_CHANGELOG_EVENTS = 4096;
const CLASS_ORDER: Readonly<Record<ResearchDecisionActivationClass, number>> = Object.freeze({
  always_on: 0,
  lane_entry: 1,
  triggered_domain: 2,
  closure_reflection: 3,
});
const EVIDENCE_CLASSES = ['Decision', 'Code', 'Static', 'Runtime', 'GAP'] as const;
const ACTIVE_CLASSES = ['always_on', 'lane_entry', 'triggered_domain', 'closure_reflection'] as const;
const DECISION_STATUSES = ['proposed', 'accepted', 'rejected', 'deferred', 'superseded'] as const;
const OPTION_STATUSES = ['considered', 'selected', 'rejected', 'deferred'] as const;
const COMPLETENESS_STATUSES = ['pass', 'blocked'] as const;
const READINESS_STATUSES = ['ready', 'blocked', 'informational'] as const;
const EXTERNAL_STATUSES = ['pass', 'blocked', 'not_required'] as const;
const CACHE_STATUSES = ['cold', 'hit', 'refreshed'] as const;
const RECORD_KEYS = {
  result: new Set([
    '$schema',
    'schema',
    'result_id',
    'work_item_id',
    'source_revision',
    'scope_id',
    'contour',
    'topic',
    'objective',
    'question',
    'source_refs',
    'findings',
    'uncertainties',
    'conflicts',
    'evidence_classes',
    'br_ids',
    'sr_ids',
    'ac_ids',
    'gap_ids',
    'options',
    'recommendation',
    'completeness',
    'readiness',
    'instruction_activation',
    'actor',
    'pointer',
    'created_at',
    'updated_at',
    'digest',
  ]),
  synthesis: new Set([
    '$schema',
    'schema',
    'bundle_id',
    'work_item_id',
    'source_revision',
    'scope_id',
    'topic',
    'result_refs',
    'findings',
    'uncertainties',
    'conflicts',
    'br_ids',
    'sr_ids',
    'ac_ids',
    'gap_ids',
    'options',
    'recommendation',
    'completeness',
    'readiness',
    'instruction_activation',
    'actor',
    'pointer',
    'created_at',
    'updated_at',
    'digest',
  ]),
  decision: new Set([
    '$schema',
    'schema',
    'decision_id',
    'work_item_id',
    'source_revision',
    'scope_id',
    'decision_type',
    'statement',
    'context',
    'options',
    'selected_option_id',
    'rationale',
    'evidence_refs',
    'br_ids',
    'sr_ids',
    'ac_ids',
    'gap_ids',
    'authority',
    'status',
    'supersedes',
    'revisit',
    'instruction_activation',
    'actor',
    'pointer',
    'created_at',
    'updated_at',
    'digest',
  ]),
  registry: new Set([
    '$schema',
    'schema',
    'registry_id',
    'revision',
    'source_revision',
    'instructions',
    'updated_at',
    'digest',
  ]),
  use: new Set([
    '$schema',
    'schema',
    'use_id',
    'work_item_id',
    'source_revision',
    'scope_id',
    'risk',
    'phase',
    'lane',
    'trigger',
    'required_instruction_ids',
    'instruction_ids',
    'registry_digest',
    'source_digests',
    'cache_status',
    'actor',
    'pointer',
    'timestamp',
    'digest',
  ]),
} as const;
const SOURCE_KEYS = new Set([
  'source_id',
  'source_kind',
  'locator',
  'title',
  'version_or_date',
  'claim',
  'retrieved_at',
  'independence_group',
  'digest',
]);
const RESULT_FINDING_KEYS = new Set(['finding_id', 'statement', 'source_ids', 'evidence_class', 'status']);
const SYNTHESIS_FINDING_KEYS = new Set(['finding_id', 'statement', 'source_refs', 'evidence_class', 'status']);
const UNCERTAINTY_KEYS = new Set(['uncertainty_id', 'statement', 'material']);
const RESULT_CONFLICT_KEYS = new Set(['conflict_id', 'statement', 'source_ids', 'status']);
const SYNTHESIS_CONFLICT_KEYS = new Set(['conflict_id', 'statement', 'source_refs', 'status']);
const OPTION_KEYS = new Set(['option_id', 'label', 'description', 'evidence_refs']);
const DECISION_OPTION_KEYS = new Set(['option_id', 'label', 'description', 'status', 'evidence_refs']);
const RECOMMENDATION_KEYS = new Set(['option_id', 'rationale', 'evidence_refs']);
const COMPLETENESS_KEYS = new Set([
  'status',
  'required_questions',
  'answered_questions',
  'missing_questions',
  'material_gaps',
  'external_validation',
]);
const EXTERNAL_KEYS = new Set(['required', 'source_count', 'minimum_sources', 'status', 'live_check']);
const RESULT_REF_KEYS = new Set(['result_id', 'digest']);
const DECISION_EVIDENCE_KEYS = new Set(['kind', 'id', 'digest', 'pointer']);
const AUTHORITY_KEYS = new Set([
  'kind',
  'actor',
  'pointer',
  'proof',
  'evidence_digest',
  'checkpoint_revision',
  'checkpoint_digest',
]);
const REVISIT_KEYS = new Set(['trigger', 'condition']);
const KNOWN_TRIGGERS = new Set([
  'research_intent',
  'domain_question',
  'external_fact',
  'api_assumption',
  'provider_change',
  'option_selection',
  'decision_needed',
  'conflict',
  'material_gap',
  'supersession',
  'correction',
  'closeout',
]);
const RECORD_ACTIVATION_KEYS = new Set([
  'use_id',
  'risk',
  'phase',
  'lane',
  'trigger',
  'required_instruction_ids',
  'instruction_ids',
  'registry_digest',
  'source_digests',
]);
const RESEARCH_ACTIVATION_TRIGGERS = [
  'research_intent',
  'domain_question',
  'external_fact',
  'api_assumption',
  'provider_change',
] as const;
const DECISION_ACTIVATION_TRIGGERS = [
  'option_selection',
  'decision_needed',
  'conflict',
  'material_gap',
  'supersession',
  'correction',
  'closeout',
] as const;
const ACTIVATION_PHASES = ['intake', 'trace', 'plan', 'execute', 'verify', 'delivery', 'closeout', 'complete'] as const;

export type ResearchDecisionActivationClass = (typeof ACTIVE_CLASSES)[number];
export type ResearchDecisionEvidenceClass = (typeof EVIDENCE_CLASSES)[number];
export type ResearchResultReadiness = (typeof READINESS_STATUSES)[number];
export type ResearchDecisionStatus = (typeof DECISION_STATUSES)[number];
export type ResearchDecisionOptionStatus = (typeof OPTION_STATUSES)[number];

export interface ResearchSourceRef {
  readonly source_kind: 'internal' | 'external';
  readonly source_id: string;
  readonly locator: string;
  readonly title: string;
  readonly version_or_date?: string | null;
  readonly claim: string;
  readonly retrieved_at: string;
  readonly independence_group?: string | null;
  readonly digest?: string | null;
}

export interface ResearchFinding {
  readonly finding_id: string;
  readonly statement: string;
  readonly source_ids: readonly string[];
  readonly evidence_class: ResearchDecisionEvidenceClass;
  readonly status: 'confirmed' | 'tentative' | 'unknown';
}

export interface ResearchSynthesisFinding {
  readonly finding_id: string;
  readonly statement: string;
  readonly source_refs: readonly string[];
  readonly evidence_class: ResearchDecisionEvidenceClass;
  readonly status: 'confirmed' | 'tentative' | 'unknown';
}

export interface ResearchUncertainty {
  readonly uncertainty_id: string;
  readonly statement: string;
  readonly material: boolean;
}

export interface ResearchConflict {
  readonly conflict_id: string;
  readonly statement: string;
  readonly source_ids: readonly string[];
  readonly status: 'open' | 'reconciled' | 'accepted_unknown';
}

export interface ResearchSynthesisConflict {
  readonly conflict_id: string;
  readonly statement: string;
  readonly source_refs: readonly string[];
  readonly status: 'open' | 'reconciled' | 'accepted_unknown';
}

export interface ResearchOption {
  readonly option_id: string;
  readonly label: string;
  readonly description: string;
  readonly evidence_refs: readonly string[];
}

export interface DecisionOption extends ResearchOption {
  readonly status: ResearchDecisionOptionStatus;
}

export interface ResearchRecommendation {
  readonly option_id: string;
  readonly rationale: string;
  readonly evidence_refs: readonly string[];
}

export interface ExternalValidation {
  readonly required: boolean;
  readonly source_count: number;
  readonly minimum_sources: number;
  readonly status: (typeof EXTERNAL_STATUSES)[number];

  readonly live_check?: boolean | null;
}

export interface RecordInstructionActivation {
  readonly use_id: string;
  readonly risk: 'low' | 'medium' | 'high';
  readonly phase: string;
  readonly lane: string;
  readonly trigger: string;
  readonly required_instruction_ids: readonly string[];
  readonly instruction_ids: readonly string[];
  readonly registry_digest: string;
  readonly source_digests: readonly { readonly instruction_id: string; readonly source_sha256: string }[];
}

export interface ResearchCompleteness {
  readonly status: (typeof COMPLETENESS_STATUSES)[number];
  readonly required_questions: readonly string[];
  readonly answered_questions: readonly string[];
  readonly missing_questions: readonly string[];
  readonly material_gaps: readonly string[];
  readonly external_validation: ExternalValidation;
}

export interface ResearchResult {
  readonly $schema?: string;
  readonly schema: 'ResearchResult/v1';
  readonly result_id: string;
  readonly work_item_id: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly contour: string;
  readonly topic: string;
  readonly objective: string;
  readonly question: string;
  readonly source_refs: readonly ResearchSourceRef[];
  readonly findings: readonly ResearchFinding[];
  readonly uncertainties: readonly ResearchUncertainty[];
  readonly conflicts: readonly ResearchConflict[];
  readonly evidence_classes: readonly ResearchDecisionEvidenceClass[];
  readonly br_ids: readonly string[];
  readonly sr_ids: readonly string[];
  readonly ac_ids: readonly string[];
  readonly gap_ids: readonly string[];
  readonly options: readonly ResearchOption[];
  readonly recommendation: ResearchRecommendation | null;
  readonly completeness: ResearchCompleteness;
  readonly readiness: ResearchResultReadiness;
  readonly instruction_activation: RecordInstructionActivation;
  readonly actor: string;
  readonly pointer: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly digest: string;
}

export interface ResearchResultRef {
  readonly result_id: string;
  readonly digest: string;
}

export interface ResearchSynthesis {
  readonly $schema?: string;
  readonly schema: 'ResearchSynthesis/v1';
  readonly bundle_id: string;
  readonly work_item_id: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly topic: string;
  readonly result_refs: readonly ResearchResultRef[];
  readonly findings: readonly ResearchSynthesisFinding[];
  readonly uncertainties: readonly ResearchUncertainty[];
  readonly conflicts: readonly ResearchSynthesisConflict[];
  readonly br_ids: readonly string[];
  readonly sr_ids: readonly string[];
  readonly ac_ids: readonly string[];
  readonly gap_ids: readonly string[];
  readonly options: readonly ResearchOption[];
  readonly recommendation: ResearchRecommendation | null;
  readonly completeness: ResearchCompleteness;
  readonly readiness: ResearchResultReadiness;
  readonly instruction_activation: RecordInstructionActivation;
  readonly actor: string;
  readonly pointer: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly digest: string;
}

export interface DecisionEvidenceRef {
  readonly kind: ResearchDecisionEvidenceClass;
  readonly id: string;
  readonly digest: string;
  readonly pointer: string;
}

export interface DecisionAuthority {
  readonly kind: 'user' | 'owner' | 'runtime_architect' | 'architect' | 'agent';
  readonly actor: string;
  readonly pointer: string;
  readonly proof: string;
  readonly evidence_digest?: string | null;
  readonly checkpoint_revision?: number;
  readonly checkpoint_digest?: string | null;
}

export interface DecisionRevisit {
  readonly trigger: string;
  readonly condition: string;
}

export interface DecisionRecord {
  readonly $schema?: string;
  readonly schema: 'DecisionRecord/v1';
  readonly decision_id: string;
  readonly work_item_id: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly decision_type: 'business' | 'technical';
  readonly statement: string;
  readonly context: string;
  readonly options: readonly DecisionOption[];
  readonly selected_option_id: string | null;
  readonly rationale: string;
  readonly evidence_refs: readonly DecisionEvidenceRef[];
  readonly br_ids: readonly string[];
  readonly sr_ids: readonly string[];
  readonly ac_ids: readonly string[];
  readonly gap_ids: readonly string[];
  readonly authority: DecisionAuthority;
  readonly status: ResearchDecisionStatus;
  readonly supersedes: string | null;
  readonly revisit: DecisionRevisit | null;
  readonly instruction_activation: RecordInstructionActivation;
  readonly actor: string;
  readonly pointer: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly digest: string;
}

export interface ActivationContextInput {
  readonly intent?: unknown;
  readonly risk?: unknown;
  readonly lane?: unknown;
  readonly lifecycle_phase?: unknown;
  readonly phase?: unknown;
  readonly contour?: unknown;
  readonly scope_id?: unknown;
  readonly work_item_id?: unknown;
  readonly source_revision?: unknown;
  readonly artifact_kind?: unknown;
  readonly triggers?: unknown;
  readonly closeout?: unknown;
  readonly source_bindings?: unknown;
  readonly required_instruction_ids?: unknown;
}

export interface ActivationContext {
  readonly intent: string;
  readonly risk: string;
  readonly lane: string;
  readonly phase: string;
  readonly contour: string;
  readonly scope_id: string;
  readonly work_item_id: string;
  readonly source_revision: string;
  readonly artifact_kind: string;
  readonly triggers: readonly string[];
  readonly source_bindings: Readonly<Record<string, string | readonly string[]>>;
  readonly required_instruction_ids: readonly string[];
}

export interface InstructionBinding {
  readonly instruction_id: string;
  readonly revision: number;
  readonly owner: string;
  readonly activation_class: ResearchDecisionActivationClass;
  readonly source_path: string;
  readonly source_sha256: string;
  readonly summary_sha256: string;
  readonly output_schema: string;
  readonly privacy: ResearchDecisionInstruction['privacy'];
  readonly reason: string;
  readonly pointer: string;
  readonly payload: string;
  readonly context: { readonly lane: string; readonly phase: string; readonly trigger: string };
}

export interface InstructionActivationMissingGap {
  readonly code: 'GAP-INSTRUCTION-MISSING-001';
  readonly instruction_id: string;
  readonly blocking: true;
}

export interface InstructionActivationCompletenessGap {
  readonly code: 'GAP-INSTRUCTION-COMPLETENESS-001';
  readonly triggers: readonly string[];
  readonly blocking: true;
}

export type InstructionActivationGap = InstructionActivationMissingGap | InstructionActivationCompletenessGap;

export interface InstructionActivationResolution {
  readonly schema: 'InstructionActivationResolution/v1';
  readonly registry_id: string;
  readonly registry_revision: number;
  readonly registry_digest: string;
  readonly context_digest: string;
  readonly context: ActivationContext;
  readonly bindings: readonly InstructionBinding[];
  readonly gaps: readonly InstructionActivationGap[];
  readonly cache_status: 'cold' | 'hit' | 'refreshed';
  readonly deterministic_order: readonly string[];
}

export interface ActivationUse {
  readonly $schema?: string;
  readonly schema: 'InstructionActivationUse/v1';
  readonly use_id: string;
  readonly work_item_id: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly risk: 'low' | 'medium' | 'high';
  readonly phase: string;
  readonly lane: string;
  readonly trigger: string;
  readonly required_instruction_ids: readonly string[];
  readonly instruction_ids: readonly string[];
  readonly registry_digest: string;
  readonly source_digests: readonly { readonly instruction_id: string; readonly source_sha256: string }[];
  readonly cache_status: 'cold' | 'hit' | 'refreshed';
  readonly actor: string;
  readonly pointer: string;
  readonly timestamp: string;
  readonly digest: string;
}

export interface ResearchDecisionRecordOptions {
  readonly root?: string;
  readonly host_state?: HostStateStore;
  readonly expected_maintenance_generation?: number;
  readonly expectedDigest?: string;
  readonly expected_digest?: string;
  readonly expectedRevision?: number;
  readonly work_item_id?: string;
  readonly source_revision?: string;
  readonly scope_id?: string;
  readonly authority_checkpoint_path?: string;
  readonly write_cache?: boolean;
}

function requireResearchWriteGate(
  options: ResearchDecisionRecordOptions,
  root: string,
): {
  readonly store: HostStateStore;
  readonly generation: number;
} {
  if (
    !HostStateStore.isHostStateStore(options.host_state) ||
    !Number.isSafeInteger(options.expected_maintenance_generation) ||
    options.expected_maintenance_generation! < 0
  )
    fail('trusted host working mutation binding required', 'GAP-RESEARCH-DECISION-HOST-001');
  try {
    options.host_state.assertWorkingRepositoryRoot(root);
  } catch {
    fail('trusted host repository binding is foreign', 'GAP-RESEARCH-DECISION-HOST-001');
  }
  return { store: options.host_state, generation: options.expected_maintenance_generation! };
}

export interface ActivationUseResult {
  readonly recorded: boolean;
  readonly replay: boolean;
  readonly use: ActivationUse;
  readonly path: string;
}

export interface DocumentationChangeEvent {
  readonly schema: 'DocumentationChangeEvent/v1';
  readonly event_id: string;
  readonly logical_edit_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly operation: 'init' | 'finalize';
  readonly document_id: string;
  readonly path_before: string | null;
  readonly path_after: string;
  readonly before_sha256: string;
  readonly after_sha256: string;
  readonly actor: string;
  readonly pointer: string;
  readonly timestamp: string;
}

export class ResearchDecisionError extends Error {
  readonly code: string;

  constructor(message: string, code = 'GAP-RESEARCH-DECISION-001') {
    super(message);
    this.name = 'ResearchDecisionError';
    this.code = code;
  }
}

type JsonRecord = Record<string, unknown>;
type RecordKind = 'research' | 'synthesis' | 'decision';
type CanonicalRecord = ResearchResult | ResearchSynthesis | DecisionRecord;
interface DecisionValidationContext {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly authority_checkpoint_path: string | undefined;
  readonly evidence_stack?: ReadonlySet<string>;
  readonly current_record_path?: string;
  readonly activation_history_direct_read?: boolean;
}

function fail(message: string, code = 'GAP-RESEARCH-DECISION-001'): never {
  throw new ResearchDecisionError(message, code);
}
function requiredResearchRoot(options: ResearchDecisionRecordOptions): string {
  if (!(typeof options.root === 'string' && path.isAbsolute(options.root)))
    fail('research record root must be an absolute path', 'GAP-RESEARCH-ROOT-001');
  return path.resolve(options.root);
}

function asRecord(value: unknown, name: string): JsonRecord {
  if (!isPlainRecord(value)) fail(name + ' must be a plain object', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  return value;
}

function cloneJson(value: unknown): JsonRecord {
  assertCanonicalJsonValue(value);
  return JSON.parse(canonicalJson(value)) as JsonRecord;
}

function frozen<T>(value: T): T {
  return freezeJsonValue(value);
}

export function digest(value: unknown): string {
  return canonicalJsonDigest(value);
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function withoutDigest(value: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'digest'));
}

function recordDigest(value: JsonRecord): string {
  return digest(withoutDigest(value));
}

function assertDigest(value: JsonRecord, name: string): void {
  hash(value.digest, name + ' digest');
  if (recordDigest(value) !== value.digest) fail(name + ' digest mismatch', 'GAP-RESEARCH-DECISION-DIGEST-001');
}
function sensitiveMaterial(value: string): boolean {
  return (
    /["']?(?:password|passphrase|secret|token|api[_-]?key|apikey|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["']?[^&\s,"'}]+/i.test(
      value,
    ) ||
    /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i.test(value) ||
    /-----BEGIN [^-]*PRIVATE KEY-----/i.test(value) ||
    /(?:[?&#]\s*|\s)(?:x-amz-(?:signature|credential|security-token)|oauth(?:[_-]?(?:token|code))?|client[_-]?secret|code|sig|signature|jwt|saml(?:response)?|session(?:id)?|state)\s*[=:]\s*[^&\s]+/i.test(
      value,
    ) ||
    /\/\/[^/\s:@]+:[^/\s@]+@/i.test(value) ||
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/i.test(value)
  );
}

function text(value: unknown, name: string, maximum = 4096): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\r\n]/.test(value))
    fail(name + ' invalid');
  if (sensitiveMaterial(value)) fail(name + ' contains sensitive material', 'GAP-RESEARCH-DECISION-PRIVACY-001');
  return value;
}
function optionalSchema(value: unknown, name: string): void {
  if (value !== undefined && value !== JSON_SCHEMA_URI)
    fail(name + ' metadata is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
}

function optionalText(value: unknown, name: string, maximum = 4096): string | null {
  return value === null || value === undefined ? null : text(value, name, maximum);
}

function id(value: unknown, name = 'id', pattern = RESULT_ID): string {
  if (typeof value !== 'string' || !pattern.test(value)) fail(name + ' invalid');
  return value;
}

function hash(value: unknown, name = 'digest'): string {
  if (typeof value !== 'string' || !DIGEST.test(value)) fail(name + ' invalid');
  return value;
}

function date(value: unknown, name: string): string {
  const result = text(value, name, 64);
  const timestamp = rfc3339TimestampMilliseconds(result);
  if (timestamp === null) fail(name + ' invalid');
  if (timestamp > Date.now() + 300_000) fail(name + ' is in the future', 'GAP-RESEARCH-DECISION-TIMESTAMP-001');
  return result;
}

function strings(value: unknown, name: string, maximum = 128, minimum = 0, itemMaximum = 4096): readonly string[] {
  if (!Array.isArray(value)) fail(name + ' invalid');
  const entries: readonly unknown[] = value;
  if (
    entries.length < minimum ||
    entries.length > maximum ||
    !entries.every(
      (item): item is string =>
        typeof item === 'string' &&
        item.trim().length > 0 &&
        item.length <= itemMaximum &&
        !/[\r\n]/.test(item) &&
        !sensitiveMaterial(item),
    ) ||
    Array.from({ length: entries.length }, (_, index) => index).some((index) => !Object.hasOwn(entries, index))
  )
    fail(name + ' invalid');
  if (new Set(entries).size !== entries.length) fail(name + ' contains duplicates');
  return entries;
}
function denseArray(value: unknown, name: string): void {
  if (
    Array.isArray(value) &&
    Array.from({ length: value.length }, (_, index) => index).some((index) => !Object.hasOwn(value, index))
  )
    fail(name + ' contains sparse holes', 'GAP-RESEARCH-DECISION-ARRAY-001');
}
function uniqueIdentifier(seen: Set<string>, identifier: string, message: string): void {
  if (seen.has(identifier)) fail(message);
  seen.add(identifier);
}
function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
  errorCode = 'GAP-RESEARCH-DECISION-001',
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail(name + ' invalid', errorCode);
  return value as T;
}

function rejectUnprovenEvidenceClass(value: string, name: string): void {
  if (value === 'Runtime' || value === 'Decision')
    fail(name + ' requires an attributable canonical receipt', 'GAP-RESEARCH-EVIDENCE-PROVENANCE-001');
}

function exactKeys(value: unknown, allowed: ReadonlySet<string>, name: string): void {
  const record = asRecord(value, name);
  if (Object.keys(record).some((key) => !allowed.has(key)))
    fail(name + ' contains unsupported fields', 'GAP-RESEARCH-DECISION-SCHEMA-001');
}

function safePointer(value: unknown, name = 'pointer'): string {
  const result = text(value, name, 512);
  const segments = result.split('/');
  const unsafe =
    path.isAbsolute(result) ||
    result.includes('\\') ||
    result.includes(':') ||
    path.posix.normalize(result) !== result ||
    segments.some((part) => !part || part === '.' || part === '..' || part.startsWith('..'));
  if (unsafe) fail(name + ' unsafe', 'GAP-RESEARCH-DECISION-SECURITY-001');
  if (/(?:password|secret|token|apikey|authorization|bearer)\s*[:=]/i.test(result))
    fail(name + ' contains sensitive material', 'GAP-RESEARCH-DECISION-PRIVACY-001');
  return result;
}

function safeSegment(value: unknown, name: string): string {
  const result = text(value, name, 256);
  const unsafe =
    path.isAbsolute(result) ||
    result.includes('/') ||
    result.includes('\\') ||
    result.includes(':') ||
    result === '.' ||
    result === '..' ||
    result.startsWith('..') ||
    /[. ]$/.test(result) ||
    /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i.test(result);
  if (unsafe) fail(name + ' unsafe', 'GAP-RESEARCH-DECISION-PATH-001');
  return result;
}

function safeActor(value: unknown, name = 'actor'): string {
  const result = text(value, name, 256);
  if (/(?:password|secret|token|apikey|authorization|bearer)\s*[:=]/i.test(result))
    fail(name + ' contains sensitive material', 'GAP-RESEARCH-DECISION-PRIVACY-001');
  return result;
}

function rawSha256(value: string | Buffer): string {
  const bytes = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return createHash('sha256').update(bytes).digest('hex');
}

function repositoryAccess(root: string): SafeRepositoryAccess {
  return requireSafeRepositoryAccess(path.resolve(root));
}

function containedPath(root: string, relative: string, label: string): string {
  const safeRoot = path.resolve(root);
  const target = resolveConfigPath(safeRoot, relative, label);
  const relativeTarget = path.relative(safeRoot, target);
  const escapes =
    relativeTarget === '..' || relativeTarget.startsWith('..' + path.sep) || path.isAbsolute(relativeTarget);
  if (escapes) fail(label + ' escapes repository root', 'GAP-RESEARCH-DECISION-PATH-001');
  return target;
}

function ensureDirectory(root: string, relative: string): string {
  const normalized = relative === '.' ? '' : relative;
  repositoryAccess(root).ensureDirectory(normalized, 'record directory');
  return containedPath(root, relative, 'record directory');
}
function directoryEntries(root: string, relative: string, label: string): readonly string[] {
  const access = repositoryAccess(root);
  if (!access.fileExists(relative, label)) return [];
  const entries = [...access.listFiles(relative, label)];
  if (entries.length > MAX_DIRECTORY_ENTRIES)
    fail(label + ' exceeds directory entry bound', 'GAP-RESEARCH-DECISION-DIRECTORY-BOUND-001');
  return entries;
}

function missingFile(relative: string): NodeJS.ErrnoException {
  return Object.assign(new Error('file is missing: ' + relative), { code: 'ENOENT' }) as NodeJS.ErrnoException;
}

function readJson(root: string, relative: string): JsonRecord {
  const access = repositoryAccess(root);
  if (!access.fileExists(relative, 'record path')) throw missingFile(relative);
  let content: string;
  try {
    content = access.readText(relative, 'record path');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
    throw error;
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_JSON_BYTES)
    fail('invalid JSON source: ' + relative, 'GAP-RESEARCH-DECISION-SOURCE-001');
  try {
    return asRecord(JSON.parse(content), relative);
  } catch (error) {
    if (error instanceof ResearchDecisionError) throw error;
    fail('invalid JSON source: ' + relative, 'GAP-RESEARCH-DECISION-SOURCE-001');
  }
}

function writeAtomic(root: string, relative: string, content: string): void {
  if (Buffer.byteLength(content, 'utf8') > MAX_JSON_BYTES)
    fail('canonical JSON source exceeds byte bound', 'GAP-RESEARCH-DECISION-SOURCE-BOUND-001');
  const directory = path.posix.dirname(relative);
  ensureDirectory(root, directory === '.' ? '.' : directory);
  const access = repositoryAccess(root);
  if (access.fileExists(relative, 'record path')) {
    const expectedHash = rawSha256(access.readBytes(relative, 'record path'));
    access.replaceAtomic(relative, expectedHash, content, 'record path');
  } else {
    access.writeExclusive(relative, content, 'record path');
  }
}

function withLock<T>(root: string, relative: string, callback: () => T): T {
  const lockRelative = relative + '.lock';
  ensureDirectory(root, path.posix.dirname(lockRelative));
  return repositoryAccess(root).withExclusiveLock(lockRelative, 'record lock', callback);
}
function withOrderedLocks<T>(root: string, relatives: readonly string[], callback: () => T): T {
  const ordered = [...new Set(relatives)].sort(compareIdentifiers);
  const run = (index: number): T =>
    index >= ordered.length ? callback() : withLock(root, ordered[index]!, () => run(index + 1));
  return run(0);
}
function optionIds(value: unknown, name: string, decision: boolean, evidenceIds?: ReadonlySet<string>): Set<string> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) fail(name + ' invalid');
  denseArray(value, name);
  const seen = new Set<string>();
  value.forEach((item) => {
    const option = asRecord(item, name + ' option');
    exactKeys(option, decision ? DECISION_OPTION_KEYS : OPTION_KEYS, name + ' option');
    const optionId = id(option.option_id, name + ' option_id');
    if (seen.has(optionId)) fail(name + ' contains duplicate option_id');
    seen.add(optionId);
    text(option.label, name + ' label', 256);
    text(option.description, name + ' description', 4096);
    if (!Object.hasOwn(option, 'evidence_refs'))
      fail(name + ' option evidence_refs is required', 'GAP-RESEARCH-DECISION-SCHEMA-001');
    const evidenceRefs = strings(option.evidence_refs, name + ' evidence_refs', 64, 0, 512);
    if (evidenceIds && evidenceRefs.some((sourceId) => !evidenceIds.has(sourceId)))
      fail(name + ' evidence_refs contains unknown source', 'GAP-RESEARCH-REFERENCE-001');
    if (decision) enumValue(option.status, OPTION_STATUSES, name + ' status');
  });
  return seen;
}
function validateSources(value: unknown): Set<string> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) fail('source_refs invalid');
  denseArray(value, 'source_refs');
  const ids = new Set<string>();
  const externalLocators = new Set<string>();
  const externalGroups = new Set<string>();
  value.forEach((item) => {
    const source = asRecord(item, 'source ref');
    exactKeys(source, SOURCE_KEYS, 'source ref');
    const sourceId = id(source.source_id, 'source_id', SOURCE_ID);
    const sourceKind = enumValue(source.source_kind, ['internal', 'external'], 'source_kind');
    const locator = text(source.locator, 'source locator', 2048);
    if (locator !== locator.trim())
      fail('source locator contains surrounding whitespace', 'GAP-WVP-SOURCE-LOCATOR-001');
    const httpLocator = /^https?:\/\//i.test(locator);
    if (httpLocator && sourceKind !== 'external')
      fail('external URL source must be typed external', 'GAP-WVP-SOURCE-TYPE-001');
    if (sourceKind === 'external') {
      let parsed: URL | undefined;
      try {
        parsed = new URL(locator);
      } catch {
        parsed = undefined;
      }
      if (
        !parsed ||
        parsed.protocol.toLowerCase() !== 'https:' ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password
      )
        fail('external source locator must be a valid HTTPS URL', 'GAP-WVP-SOURCE-LOCATOR-001');
      if (externalLocators.has(locator)) fail('external source locators must be distinct', 'GAP-WVP-INDEPENDENCE-001');
      externalLocators.add(locator);
      const group = optionalText(source.independence_group, 'source independence_group', 256);
      if (group === null) fail('external source independence_group is required', 'GAP-WVP-INDEPENDENCE-001');
      if (externalGroups.has(group))
        fail('external source independence groups must be distinct', 'GAP-WVP-INDEPENDENCE-001');
      externalGroups.add(group);
    } else {
      optionalText(source.independence_group, 'source independence_group', 256);
    }
    uniqueIdentifier(ids, sourceId, 'source refs contain duplicate source_id');
    text(source.title, 'source title', 512);
    text(source.claim, 'source claim', 4096);
    date(source.retrieved_at, 'source retrieved_at');
    optionalText(source.version_or_date, 'source version_or_date', 256);
    if (source.digest !== null && source.digest !== undefined) hash(source.digest, 'source digest');
  });
  return ids;
}

function validateCommonBindings(record: JsonRecord, includeQuestion: boolean): void {
  text(record.work_item_id, 'work_item_id', 256);
  text(record.source_revision, 'source_revision', 2048);
  text(record.scope_id, 'scope_id', 512);
  if (includeQuestion) {
    text(record.contour, 'contour', 512);
    text(record.topic, 'topic', 512);
    text(record.objective, 'objective', 4096);
    text(record.question, 'question', 4096);
  } else {
    text(record.topic, 'topic', 512);
  }
  strings(record.br_ids, 'br_ids', 32, 0, 512);
  strings(record.sr_ids, 'sr_ids', 32, 0, 512);
  strings(record.ac_ids, 'ac_ids', 32, 0, 512);
  strings(record.gap_ids, 'gap_ids', 32, 0, 512);
  safeActor(record.actor);
  safePointer(record.pointer);
  const created = date(record.created_at, 'created_at');
  const updated = date(record.updated_at, 'updated_at');
  const updatedTimestamp = rfc3339TimestampMilliseconds(updated);
  const createdTimestamp = rfc3339TimestampMilliseconds(created);
  if (updatedTimestamp === null || createdTimestamp === null || updatedTimestamp < createdTimestamp)
    fail('updated_at precedes created_at');
}

function assertExternalCountBound(value: unknown): void {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 64) fail('external_validation bounds invalid');
}
function parseExternalValidationShape(external: unknown): {
  readonly value: JsonRecord;
  readonly status: ExternalValidation['status'];
} {
  const value = asRecord(external, 'external_validation');
  exactKeys(value, EXTERNAL_KEYS, 'external_validation');
  if (!Object.hasOwn(value, 'live_check'))
    fail('external_validation.live_check is required', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  if (typeof value.required !== 'boolean') fail('external_validation bounds invalid');
  assertExternalCountBound(value.source_count);
  assertExternalCountBound(value.minimum_sources);
  const status = enumValue(value.status, EXTERNAL_STATUSES, 'external_validation.status');
  if (!([null, undefined, true, false] as readonly unknown[]).includes(value.live_check))
    fail('external_validation.live_check invalid');
  return { value, status };
}
function externalSourceRefs(record: JsonRecord): JsonRecord[] | null {
  return Array.isArray(record.source_refs) ? record.source_refs.map((source) => asRecord(source, 'source ref')) : null;
}
function externalActivationTrigger(record: JsonRecord): string {
  return isPlainRecord(record.instruction_activation) ? (scalarText(record.instruction_activation.trigger) ?? '') : '';
}
function externalTopic(record: JsonRecord, activationTrigger: string): string {
  return (
    text(record.topic, 'topic', 512) +
    ' ' +
    (optionalText(record.contour, 'contour', 512) ?? '') +
    ' ' +
    (optionalText(record.objective, 'objective', 4096) ?? '') +
    ' ' +
    (optionalText(record.question, 'question', 4096) ?? '') +
    ' ' +
    activationTrigger
  );
}
function countedExternalSources(
  sourceRefs: JsonRecord[] | null,
  externalSources: JsonRecord[],
  externalSignal: boolean,
): JsonRecord[] | null {
  return sourceRefs === null ? null : externalSignal ? externalSources : sourceRefs;
}
function externalValidationContext(record: JsonRecord): {
  readonly countedSources: JsonRecord[] | null;
  readonly activationTrigger: string;
  readonly externalSignal: boolean;
  readonly topic: string;
} {
  const sourceRefs = externalSourceRefs(record);
  const externalSources = sourceRefs?.filter((source) => source.source_kind === 'external') ?? [];
  const activationTrigger = externalActivationTrigger(record);
  const topic = externalTopic(record, activationTrigger);
  const externalSignal =
    externalSources.length > 0 || ['external_fact', 'api_assumption', 'provider_change'].includes(activationTrigger);
  const countedSources = countedExternalSources(sourceRefs, externalSources, externalSignal);
  return { countedSources, activationTrigger, externalSignal, topic };
}
function assertExternalRequirement(
  value: JsonRecord,
  status: ExternalValidation['status'],
  externalSignal: boolean,
): void {
  if (externalSignal && (value.required !== true || status === 'not_required'))
    fail('external research requires web validation', 'GAP-WVP-REQUIRED-001');
}
function externalMinimum(value: JsonRecord, topic: string): number {
  return value.required
    ? /security|architecture|compliance/i.test(topic)
      ? 3
      : Math.max(2, Number(value.minimum_sources))
    : Number(value.minimum_sources);
}
function assertExternalDeclaredCount(value: JsonRecord, countedSources: JsonRecord[] | null): void {
  if (value.required && countedSources !== null && Number(value.source_count) !== countedSources.length)
    fail('external_validation source_count does not match counted sources', 'GAP-WVP-SOURCE-COUNT-001');
}
function passingRequiredExternal(value: JsonRecord, status: ExternalValidation['status']): boolean {
  return Boolean(value.required && status === 'pass');
}
function assertExternalMinimum(value: JsonRecord, countedSources: JsonRecord[] | null, minimum: number): void {
  const sourceCount = countedSources === null ? Number(value.source_count) : countedSources.length;
  if (sourceCount < minimum) fail('web validation requires more independent sources', 'GAP-WVP-SOURCE-COUNT-001');
}
function assertExternalGroups(countedSources: JsonRecord[], minimum: number): void {
  const groups = new Set(countedSources.map((source) => String(source.independence_group || source.source_id))).size;
  if (groups < minimum) fail('web validation requires independent source groups', 'GAP-WVP-INDEPENDENCE-001');
}
function assertPassingExternalEvidence(
  value: JsonRecord,
  status: ExternalValidation['status'],
  countedSources: JsonRecord[] | null,
  minimum: number,
): void {
  if (!passingRequiredExternal(value, status)) return;
  assertExternalMinimum(value, countedSources, minimum);
  if (countedSources !== null) assertExternalGroups(countedSources, minimum);
}
function assertExternalLiveCheck(
  value: JsonRecord,
  status: ExternalValidation['status'],
  activationTrigger: string,
): void {
  if (
    passingRequiredExternal(value, status) &&
    value.live_check !== true &&
    ['api_assumption', 'provider_change'].includes(activationTrigger)
  )
    fail('live API/provider check required', 'GAP-WVP-LIVE-CHECK-001');
}
function validateExternalEvidence(
  value: JsonRecord,
  status: ExternalValidation['status'],
  context: ReturnType<typeof externalValidationContext>,
): void {
  const { countedSources, activationTrigger, externalSignal, topic } = context;
  assertExternalRequirement(value, status, externalSignal);
  const minimum = externalMinimum(value, topic);
  assertExternalDeclaredCount(value, countedSources);
  assertPassingExternalEvidence(value, status, countedSources, minimum);
  assertExternalLiveCheck(value, status, activationTrigger);
}
function validateExternal(record: JsonRecord, external: unknown): ExternalValidation {
  const { value, status } = parseExternalValidationShape(external);
  validateExternalEvidence(value, status, externalValidationContext(record));
  return value as unknown as ExternalValidation;
}
function assertRequiredResearchQuestion(record: JsonRecord, required: ReadonlySet<string>): void {
  if (record.schema === 'ResearchResult/v1' && !required.has(text(record.question, 'question', 4096)))
    fail('research result question is missing from completeness.required_questions', 'GAP-RESEARCH-COMPLETENESS-001');
}
function assertQuestionAccounting(
  required: ReadonlySet<string>,
  answered: ReadonlySet<string>,
  missing: readonly string[],
): void {
  if (
    [...answered].some((question) => missing.includes(question)) ||
    [...required].some((question) => !answered.has(question) && !missing.includes(question))
  )
    fail('completeness question coverage is incomplete', 'GAP-RESEARCH-COMPLETENESS-001');
}
function completenessQuestionCoverage(
  record: JsonRecord,
  completeness: JsonRecord,
): {
  readonly missing: readonly string[];
  readonly gaps: readonly string[];
} {
  const required = new Set(strings(completeness.required_questions, 'required_questions', 64, 0, 4096));
  assertRequiredResearchQuestion(record, required);
  const answered = new Set(strings(completeness.answered_questions, 'answered_questions', 64, 0, 4096));
  const missing = strings(completeness.missing_questions, 'missing_questions', 64, 0, 4096);
  const gaps = strings(completeness.material_gaps, 'material_gaps', 64, 0, 512);
  assertQuestionAccounting(required, answered, missing);
  return { missing, gaps };
}
function hasOpenConflict(record: JsonRecord): boolean {
  return (
    Array.isArray(record.conflicts) && record.conflicts.some((item) => isPlainRecord(item) && item.status === 'open')
  );
}
function hasUnknownEvidence(record: JsonRecord): boolean {
  return (
    (Array.isArray(record.findings) &&
      record.findings.some(
        (item) => isPlainRecord(item) && (item.status === 'unknown' || item.evidence_class === 'GAP'),
      )) ||
    (Array.isArray(record.uncertainties) &&
      record.uncertainties.some((item) => isPlainRecord(item) && item.material === true))
  );
}
function assertNoUnresolvedCompleteness(completeness: JsonRecord, unresolved: boolean): void {
  if (completeness.status === 'pass' && unresolved)
    fail('completeness pass contains unresolved gaps', 'GAP-RESEARCH-COMPLETENESS-001');
}
function completenessSupportsReadiness(completeness: JsonRecord, external: ExternalValidation): boolean {
  return completeness.status === 'pass' && (!external.required || external.status === 'pass');
}
function assertCompletenessReadiness(
  record: JsonRecord,
  completeness: JsonRecord,
  external: ExternalValidation,
  unresolved: boolean,
): void {
  assertNoUnresolvedCompleteness(completeness, unresolved);
  if (record.readiness === 'ready' && !completenessSupportsReadiness(completeness, external))
    fail('research readiness is not supported by completeness', 'GAP-RESEARCH-READINESS-001');
}
function validateCompleteness(record: JsonRecord): void {
  const completeness = asRecord(record.completeness, 'completeness');
  exactKeys(completeness, COMPLETENESS_KEYS, 'completeness');
  enumValue(completeness.status, COMPLETENESS_STATUSES, 'completeness.status');
  const { missing, gaps } = completenessQuestionCoverage(record, completeness);
  const external = validateExternal(record, completeness.external_validation);
  const unresolved = missing.length > 0 || gaps.length > 0 || hasOpenConflict(record) || hasUnknownEvidence(record);
  assertCompletenessReadiness(record, completeness, external, unresolved);
}
function validateReadyTrace(record: JsonRecord): void {
  if (record.readiness !== 'ready') return;
  if (
    !Array.isArray(record.br_ids) ||
    record.br_ids.length === 0 ||
    !Array.isArray(record.sr_ids) ||
    record.sr_ids.length === 0 ||
    !Array.isArray(record.ac_ids) ||
    record.ac_ids.length === 0
  )
    fail('ready research requires BR/SR/AC bindings', 'GAP-RESEARCH-TRACE-001');
}

function activationUseMatchesResolution(
  use: ActivationUse,
  context: ActivationContext,
  resolution: InstructionActivationResolution,
): boolean {
  const expectedSourceDigests = resolution.bindings.map((binding) => ({
    instruction_id: binding.instruction_id,
    source_sha256: binding.source_sha256,
  }));
  return (
    use.work_item_id === context.work_item_id &&
    use.source_revision === context.source_revision &&
    use.scope_id === context.scope_id &&
    use.registry_digest === resolution.registry_digest &&
    use.risk === context.risk &&
    use.phase === context.phase &&
    use.lane === context.lane &&
    use.trigger === (context.triggers[0] ?? 'always_on') &&
    canonicalJson(use.required_instruction_ids) === canonicalJson(context.required_instruction_ids) &&
    canonicalJson(use.instruction_ids) === canonicalJson(resolution.deterministic_order) &&
    canonicalJson(use.source_digests) === canonicalJson(expectedSourceDigests)
  );
}

function validateRecordInstructionActivation(
  record: JsonRecord,
  context?: DecisionValidationContext,
): RecordInstructionActivation {
  const activation = asRecord(record.instruction_activation, 'instruction activation');
  const isDecision = record.schema === 'DecisionRecord/v1';
  const label = isDecision ? 'decision instruction activation' : 'research instruction activation';
  exactKeys(activation, RECORD_ACTIVATION_KEYS, label);
  id(activation.use_id, label + ' use_id', USE_ID);
  enumValue(activation.risk, ['low', 'medium', 'high'], label + ' risk');
  enumValue(activation.phase, ACTIVATION_PHASES, label + ' phase', 'GAP-RESEARCH-ACTIVATION-001');
  text(activation.lane, label + ' lane', 128);
  enumValue(
    activation.trigger,
    isDecision ? DECISION_ACTIVATION_TRIGGERS : RESEARCH_ACTIVATION_TRIGGERS,
    label + ' trigger',
  );
  const requiredInstructionIds = strings(
    activation.required_instruction_ids,
    label + ' required_instruction_ids',
    64,
    0,
    128,
  );
  requiredInstructionIds.forEach((instructionId) => id(instructionId, label + ' required instruction_id'));
  const instructionIds = strings(activation.instruction_ids, label + ' instruction_ids', 64, 1, 128);
  instructionIds.forEach((instructionId) => id(instructionId, label + ' instruction_id'));
  hash(activation.registry_digest, label + ' registry_digest');
  if (
    !Array.isArray(activation.source_digests) ||
    activation.source_digests.length !== instructionIds.length ||
    Array.from(
      { length: Array.isArray(activation.source_digests) ? activation.source_digests.length : 0 },
      (_, index) => index,
    ).some((index) => !Object.hasOwn(activation.source_digests as object, index))
  )
    fail(label + ' source_digests are incomplete', 'GAP-RESEARCH-ACTIVATION-001');
  const sourceIds = new Set<string>();
  activation.source_digests.forEach((item) => {
    const source = asRecord(item, label + ' source digest');
    exactKeys(source, new Set(['instruction_id', 'source_sha256']), label + ' source digest');
    const instructionId = id(source.instruction_id, label + ' source instruction_id');
    if (sourceIds.has(instructionId) || !instructionIds.includes(instructionId))
      fail(label + ' source binding is invalid', 'GAP-RESEARCH-ACTIVATION-001');
    sourceIds.add(instructionId);
    hash(source.source_sha256, label + ' source_sha256');
  });
  if (!context) return activation as unknown as RecordInstructionActivation;
  const activationContext = {
    intent: activation.trigger,
    risk: activation.risk,
    lane: activation.lane,
    phase: activation.phase,
    lifecycle_phase: activation.phase,
    contour: scalarText(record.contour) ?? scalarText(record.scope_id) ?? 'unknown',
    scope_id: record.scope_id,
    work_item_id: record.work_item_id,
    source_revision: record.source_revision,
    artifact_kind: isDecision ? 'decision' : 'research',
    triggers: [activation.trigger],
    required_instruction_ids: requiredInstructionIds,
  } satisfies ActivationContextInput;
  const resolution = resolveInstructionActivation(activationContext, { root: context.root, write_cache: false });
  const blocking = resolution.gaps.filter((gap) => gap.blocking === true);
  if (blocking.length > 0)
    fail(label + ' has a blocking resolver gap: ' + blocking[0]!.code, 'GAP-RESEARCH-ACTIVATION-001');
  const expectedSourceDigests = resolution.bindings.map((binding) => ({
    instruction_id: binding.instruction_id,
    source_sha256: binding.source_sha256,
  }));
  if (
    activation.registry_digest !== resolution.registry_digest ||
    canonicalJson(instructionIds) !== canonicalJson(resolution.deterministic_order) ||
    canonicalJson(activation.source_digests) !== canonicalJson(expectedSourceDigests)
  )
    fail(label + ' is stale or does not match the current resolver', 'GAP-RESEARCH-ACTIVATION-001');
  const history = () =>
    readActivationHistory(context.root, context.feature, text(record.work_item_id, 'record work_item_id'));
  const use = (
    context.activation_history_direct_read
      ? history()
      : withLock(
          context.root,
          activationHistoryRelative(context.feature, text(record.work_item_id, 'record work_item_id')),
          history,
        )
  )
    .reverse()
    .find((candidate) => candidate.use_id === activation.use_id);
  if (!use || !activationUseMatchesResolution(use, resolution.context, resolution))
    fail(label + ' use is missing or stale', 'GAP-RESEARCH-ACTIVATION-001');
  return activation as unknown as RecordInstructionActivation;
}

function validateResult(value: JsonRecord, context?: DecisionValidationContext): ResearchResult {
  if (value.schema !== 'ResearchResult/v1') fail('ResearchResult schema invalid');
  exactKeys(value, RECORD_KEYS.result, 'ResearchResult');
  optionalSchema(value.$schema, 'ResearchResult');
  denseArray(value.findings, 'findings');
  denseArray(value.uncertainties, 'uncertainties');
  denseArray(value.conflicts, 'conflicts');
  id(value.result_id, 'result_id');
  validateCommonBindings(value, true);
  validateRecordInstructionActivation(value, context);
  const sourceIds = validateSources(value.source_refs);
  if (!Array.isArray(value.findings) || value.findings.length > 128) fail('findings invalid');
  const findingIds = new Set<string>();
  value.findings.forEach((item) => {
    const finding = asRecord(item, 'finding');
    exactKeys(finding, RESULT_FINDING_KEYS, 'finding');
    const findingId = text(finding.finding_id, 'finding_id', 256);
    uniqueIdentifier(findingIds, findingId, 'findings contain duplicate finding_id');
    text(finding.statement, 'finding statement', 4096);
    const references = strings(finding.source_ids, 'finding source_ids', 64, 1, 128);
    references.forEach((source) => {
      if (!sourceIds.has(source)) fail('finding references unknown source');
    });
    const evidenceClass = enumValue(finding.evidence_class, EVIDENCE_CLASSES, 'finding evidence_class');
    rejectUnprovenEvidenceClass(evidenceClass, 'finding evidence_class');
    enumValue(finding.status, ['confirmed', 'tentative', 'unknown'], 'finding status');
  });
  if (!Array.isArray(value.uncertainties) || value.uncertainties.length > 64) fail('uncertainties invalid');
  const uncertaintyIds = new Set<string>();
  value.uncertainties.forEach((item) => {
    const uncertainty = asRecord(item, 'uncertainty');
    exactKeys(uncertainty, UNCERTAINTY_KEYS, 'uncertainty');
    const uncertaintyId = text(uncertainty.uncertainty_id, 'uncertainty_id', 256);
    uniqueIdentifier(uncertaintyIds, uncertaintyId, 'uncertainties contain duplicate uncertainty_id');
    text(uncertainty.statement, 'uncertainty statement', 4096);
    if (typeof uncertainty.material !== 'boolean') fail('uncertainty material invalid');
  });
  if (!Array.isArray(value.conflicts) || value.conflicts.length > 64) fail('conflicts invalid');
  const conflictIds = new Set<string>();
  value.conflicts.forEach((item) => {
    const conflict = asRecord(item, 'conflict');
    exactKeys(conflict, RESULT_CONFLICT_KEYS, 'conflict');
    const conflictId = text(conflict.conflict_id, 'conflict_id', 256);
    uniqueIdentifier(conflictIds, conflictId, 'conflicts contain duplicate conflict_id');
    text(conflict.statement, 'conflict statement', 4096);
    const references = strings(conflict.source_ids, 'conflict source_ids', 64, 2, 128);
    references.forEach((source) => {
      if (!sourceIds.has(source)) fail('conflict references unknown source');
    });
    enumValue(conflict.status, ['open', 'reconciled', 'accepted_unknown'], 'conflict status');
  });
  const evidenceClasses = strings(value.evidence_classes, 'evidence_classes', 5);
  evidenceClasses.forEach((item) => {
    const evidenceClass = enumValue(item, EVIDENCE_CLASSES, 'evidence class');
    rejectUnprovenEvidenceClass(evidenceClass, 'evidence class');
  });
  validateRecommendation(value.options, value.recommendation, false, sourceIds);
  enumValue(value.readiness, READINESS_STATUSES, 'readiness');
  validateCompleteness(value);
  validateReadyTrace(value);
  assertDigest(value, 'ResearchResult');
  return value as unknown as ResearchResult;
}

function validateRecommendation(
  options: unknown,
  recommendation: unknown,
  decision: boolean,
  evidenceIds?: ReadonlySet<string>,
): void {
  const optionSet = optionIds(options, decision ? 'decision options' : 'options', decision, evidenceIds);
  if (recommendation === null) return;
  const value = asRecord(recommendation, 'recommendation');
  exactKeys(value, RECOMMENDATION_KEYS, 'recommendation');
  if (!optionSet.has(String(value.option_id))) fail('recommendation option missing');
  id(value.option_id, 'recommendation option_id');
  text(value.rationale, 'recommendation rationale', 4096);
  const evidenceRefs = strings(value.evidence_refs, 'recommendation evidence_refs', 64, 0, 512);
  if (evidenceIds && evidenceRefs.some((sourceId) => !evidenceIds.has(sourceId)))
    fail('recommendation evidence_refs contains unknown source', 'GAP-RESEARCH-REFERENCE-001');
}

function validateSynthesis(value: JsonRecord, context?: DecisionValidationContext): ResearchSynthesis {
  if (value.schema !== 'ResearchSynthesis/v1') fail('ResearchSynthesis schema invalid');
  exactKeys(value, RECORD_KEYS.synthesis, 'ResearchSynthesis');
  optionalSchema(value.$schema, 'ResearchSynthesis');
  denseArray(value.result_refs, 'result_refs');
  denseArray(value.findings, 'synthesis findings');
  denseArray(value.uncertainties, 'synthesis uncertainties');
  denseArray(value.conflicts, 'synthesis conflicts');
  id(value.bundle_id, 'bundle_id');
  validateCommonBindings(value, false);
  validateRecordInstructionActivation(value, context);
  if (!Array.isArray(value.result_refs) || value.result_refs.length < 1 || value.result_refs.length > 64)
    fail('result_refs invalid');
  const resultIds = new Set<string>();
  value.result_refs.forEach((item) => {
    const reference = asRecord(item, 'result_ref');
    exactKeys(reference, RESULT_REF_KEYS, 'result_ref');
    const resultId = id(reference.result_id, 'result_ref.result_id');
    uniqueIdentifier(resultIds, resultId, 'result_refs contain duplicate result_id');
    hash(reference.digest, 'result_ref.digest');
  });
  if (!Array.isArray(value.findings) || value.findings.length > 128) fail('synthesis findings invalid');
  const findingIds = new Set<string>();
  value.findings.forEach((item) => {
    const finding = asRecord(item, 'synthesis finding');
    exactKeys(finding, SYNTHESIS_FINDING_KEYS, 'synthesis finding');
    const findingId = text(finding.finding_id, 'synthesis finding_id', 256);
    uniqueIdentifier(findingIds, findingId, 'synthesis findings contain duplicate finding_id');
    text(finding.statement, 'synthesis finding statement', 4096);
    strings(finding.source_refs, 'synthesis source_refs', 64, 1, 512);
    const evidenceClass = enumValue(finding.evidence_class, EVIDENCE_CLASSES, 'synthesis evidence class');
    rejectUnprovenEvidenceClass(evidenceClass, 'synthesis evidence class');
    enumValue(finding.status, ['confirmed', 'tentative', 'unknown'], 'synthesis finding status');
  });
  if (!Array.isArray(value.uncertainties) || value.uncertainties.length > 64) fail('synthesis uncertainties invalid');
  const uncertaintyIds = new Set<string>();
  value.uncertainties.forEach((item) => {
    const uncertainty = asRecord(item, 'synthesis uncertainty');
    exactKeys(uncertainty, UNCERTAINTY_KEYS, 'synthesis uncertainty');
    const uncertaintyId = text(uncertainty.uncertainty_id, 'synthesis uncertainty_id', 256);
    uniqueIdentifier(uncertaintyIds, uncertaintyId, 'synthesis uncertainties contain duplicate uncertainty_id');
    text(uncertainty.statement, 'synthesis uncertainty statement', 4096);
    if (typeof uncertainty.material !== 'boolean') fail('synthesis uncertainty material invalid');
  });
  if (!Array.isArray(value.conflicts) || value.conflicts.length > 64) fail('synthesis conflicts invalid');
  const conflictIds = new Set<string>();
  value.conflicts.forEach((item) => {
    const conflict = asRecord(item, 'synthesis conflict');
    exactKeys(conflict, SYNTHESIS_CONFLICT_KEYS, 'synthesis conflict');
    const conflictId = text(conflict.conflict_id, 'synthesis conflict_id', 256);
    uniqueIdentifier(conflictIds, conflictId, 'synthesis conflicts contain duplicate conflict_id');
    text(conflict.statement, 'synthesis conflict statement', 4096);
    strings(conflict.source_refs, 'synthesis source_refs', 64, 2, 512);
    enumValue(conflict.status, ['open', 'reconciled', 'accepted_unknown'], 'synthesis conflict status');
  });
  validateRecommendation(value.options, value.recommendation, false);
  enumValue(value.readiness, READINESS_STATUSES, 'readiness');
  validateCompleteness(value);
  validateReadyTrace(value);
  assertDigest(value, 'ResearchSynthesis');
  return value as unknown as ResearchSynthesis;
}

function validateDecisionEvidence(input: unknown): void {
  if (!Array.isArray(input) || input.length < 1 || input.length > 128) fail('decision evidence_refs invalid');
  const seen = new Set<string>();
  input.forEach((item) => {
    const evidence = asRecord(item, 'decision evidence ref');
    exactKeys(evidence, DECISION_EVIDENCE_KEYS, 'decision evidence ref');
    const kind = enumValue(evidence.kind, EVIDENCE_CLASSES, 'decision evidence kind');
    if (kind === 'Runtime')
      fail('decision Runtime evidence requires an attributable host receipt', 'GAP-RESEARCH-EVIDENCE-PROVENANCE-001');
    const idValue = text(evidence.id, 'decision evidence id', 512);
    const digestValue = hash(evidence.digest, 'decision evidence digest');
    const pointer = safePointer(evidence.pointer, 'decision evidence pointer');
    const identity = kind + ':' + idValue + ':' + digestValue + ':' + pointer;
    if (seen.has(identity)) fail('decision evidence refs contain duplicates');
    seen.add(identity);
  });
}

function validateDecision(value: JsonRecord, context?: DecisionValidationContext): DecisionRecord {
  if (value.schema !== 'DecisionRecord/v1') fail('DecisionRecord schema invalid');
  exactKeys(value, RECORD_KEYS.decision, 'DecisionRecord');
  optionalSchema(value.$schema, 'DecisionRecord');
  denseArray(value.options, 'decision options');
  denseArray(value.evidence_refs, 'decision evidence_refs');
  if (!Object.hasOwn(value, 'supersedes') || !Object.hasOwn(value, 'revisit'))
    fail('DecisionRecord required supersession/revisit fields missing', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  id(value.decision_id, 'decision_id');
  text(value.work_item_id, 'work_item_id', 256);
  text(value.source_revision, 'source_revision', 2048);
  text(value.scope_id, 'scope_id', 512);
  enumValue(value.decision_type, ['business', 'technical'], 'decision_type');
  text(value.statement, 'decision statement', 4096);
  text(value.context, 'decision context', 4096);
  text(value.rationale, 'decision rationale', 8192);
  validateRecordInstructionActivation(value, context);
  const options = optionIds(value.options, 'decision options', true);
  if (!Object.hasOwn(value, 'selected_option_id'))
    fail('selected_option_id is required', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  const selectedOption = optionalText(value.selected_option_id, 'selected_option_id', 128);
  if (selectedOption !== null) {
    id(selectedOption, 'selected_option_id');
    if (!options.has(selectedOption)) fail('selected option missing');
  }
  validateDecisionEvidence(value.evidence_refs);
  strings(value.br_ids, 'decision br_ids', 32, 0, 512);
  strings(value.sr_ids, 'decision sr_ids', 32, 0, 512);
  strings(value.ac_ids, 'decision ac_ids', 32, 0, 512);
  strings(value.gap_ids, 'decision gap_ids', 32, 0, 512);
  const authority = validateAuthority(value.authority);
  const decisionActor = safeActor(value.actor, 'decision actor');
  safePointer(value.pointer, 'decision pointer');
  const created = date(value.created_at, 'decision created_at');
  const updated = date(value.updated_at, 'decision updated_at');
  const updatedTimestamp = rfc3339TimestampMilliseconds(updated);
  const createdTimestamp = rfc3339TimestampMilliseconds(created);
  if (updatedTimestamp === null || createdTimestamp === null || updatedTimestamp < createdTimestamp)
    fail('decision updated_at precedes created_at');
  enumValue(value.status, DECISION_STATUSES, 'decision status');
  optionalText(value.supersedes, 'supersedes', 128);
  if (value.supersedes !== null && value.supersedes !== undefined) id(value.supersedes, 'supersedes');
  validateRevisit(value.revisit);
  const selectedOptions = (value.options as unknown[])
    .map((item) => asRecord(item, 'decision option'))
    .filter((item) => item.status === 'selected');
  if (
    selectedOptions.length > 1 ||
    (selectedOption !== null && selectedOptions.length === 1 && selectedOptions[0]?.option_id !== selectedOption)
  )
    fail('decision option selection is inconsistent', 'GAP-DECISION-SELECTION-001');
  if (value.status === 'superseded' && !value.supersedes) fail('superseded decision must identify superseded record');
  if (value.status === 'accepted') {
    if (
      context &&
      (value.evidence_refs as unknown[]).some(
        (item) =>
          canonicalEvidenceRelative(String(asRecord(item, 'decision evidence ref').pointer), context.feature) === null,
      )
    )
      fail('accepted decision evidence must use canonical records', 'GAP-DECISION-EVIDENCE-CANONICAL-001');
    if (selectedOption === null || selectedOptions.length !== 1)
      fail('accepted decision must select one option', 'GAP-DECISION-SELECTION-001');
    if (
      (value.br_ids as unknown[]).length === 0 ||
      (value.sr_ids as unknown[]).length === 0 ||
      (value.ac_ids as unknown[]).length === 0
    )
      fail('accepted decision requires BR/SR/AC bindings', 'GAP-DECISION-TRACE-001');
    if (
      authority.kind === 'agent' ||
      /^(?:agent|researcher|synthesizer|web-researcher|codebase-mapper)(?:[:.-]|$)/i.test(decisionActor) ||
      /^(?:agent|researcher|synthesizer|web-researcher|codebase-mapper)(?:[:.-]|$)/i.test(authority.actor)
    )
      fail('agent recommendation cannot become accepted', 'GAP-DECISION-AGENT-ACCEPT-001');
    const allowed = value.decision_type === 'business' ? ['user', 'owner'] : ['runtime_architect', 'architect'];
    if (!allowed.includes(authority.kind))
      fail('decision authority is not allowed for accepted decision', 'GAP-DECISION-AUTHORITY-001');
    const authorityPrefix =
      value.decision_type === 'business'
        ? authority.kind === 'user'
          ? 'user:'
          : 'owner:'
        : authority.kind === 'runtime_architect'
          ? 'runtime:'
          : 'architect:';
    if (!authority.actor.toLowerCase().startsWith(authorityPrefix))
      fail('decision authority actor is not attributable to its authority kind', 'GAP-DECISION-AUTHORITY-001');
    const authorityEvidence = authority.pointer + ' ' + authority.proof;
    const required = value.decision_type === 'business' ? /QuestionCandidate|HumanAnswer/i : /ArchitectDecision/i;
    if (!required.test(authorityEvidence))
      fail('accepted decision lacks attributable authority evidence', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    if (context)
      validateAcceptedAuthorityEvidence(
        context.root,
        context.feature,
        value as unknown as DecisionRecord,
        authority,
        context.authority_checkpoint_path,
      );
  }
  if (context)
    resolveCanonicalEvidence(
      context.root,
      context.feature,
      value as unknown as DecisionRecord,
      context.evidence_stack,
      context,
    );
  assertDigest(value, 'DecisionRecord');
  return value as unknown as DecisionRecord;
}

function validateAuthority(value: unknown): DecisionAuthority {
  const authority = asRecord(value, 'decision authority');
  exactKeys(authority, AUTHORITY_KEYS, 'decision authority');
  const kind = enumValue(
    authority.kind,
    ['user', 'owner', 'runtime_architect', 'architect', 'agent'],
    'authority.kind',
  );
  const actor = safeActor(authority.actor, 'authority.actor');
  const pointer = safePointer(authority.pointer, 'authority.pointer');
  const proof = text(authority.proof, 'authority.proof', 2048);
  if (Object.hasOwn(authority, 'evidence_digest')) hash(authority.evidence_digest, 'authority evidence_digest');
  if (
    authority.checkpoint_revision !== undefined &&
    (!Number.isInteger(authority.checkpoint_revision) || Number(authority.checkpoint_revision) < 1)
  )
    fail('authority checkpoint_revision invalid', 'GAP-DECISION-AUTHORITY-001');
  if (Object.hasOwn(authority, 'checkpoint_digest')) hash(authority.checkpoint_digest, 'authority checkpoint_digest');
  return {
    kind,
    actor,
    pointer,
    proof,
    ...(authority.evidence_digest === undefined
      ? {}
      : { evidence_digest: authority.evidence_digest === null ? null : (authority.evidence_digest as string) }),
    ...(authority.checkpoint_revision === undefined
      ? {}
      : { checkpoint_revision: Number(authority.checkpoint_revision) }),
    ...(authority.checkpoint_digest === undefined
      ? {}
      : { checkpoint_digest: authority.checkpoint_digest === null ? null : (authority.checkpoint_digest as string) }),
  };
}

function authorityFragment(value: string, schemaName: string, name: string): string {
  const prefix = schemaName + '#';
  if (!value.startsWith(prefix)) fail(name + ' must point to ' + schemaName, 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  const fragment = value.slice(prefix.length);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(fragment))
    fail(name + ' fragment invalid', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  return fragment;
}

function authorityCheckpointRelative(
  feature: ResearchDecisionConfig,
  record: DecisionRecord,
  configuredPath?: string,
): string {
  const canonical = path.posix.join(
    feature.paths.activation_history,
    safeSegment(record.work_item_id, 'authority work_item_id'),
    'resume.json',
  );
  if (configuredPath !== undefined && configuredPath !== canonical)
    fail('authority checkpoint path must be the current work checkpoint', 'GAP-DECISION-AUTHORITY-001');
  return canonical;
}

function authorityCheckpoint(
  root: string,
  feature: ResearchDecisionConfig,
  record: DecisionRecord,
  configuredPath?: string,
): JsonRecord {
  const relative = authorityCheckpointRelative(feature, record, configuredPath);
  try {
    return readJson(root, relative);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      fail('authority checkpoint is missing', 'GAP-DECISION-AUTHORITY-001');
    throw error;
  }
}

function checkpointScopeId(checkpoint: JsonRecord): unknown {
  if (checkpoint.scope_id !== undefined) return checkpoint.scope_id;
  if (isPlainRecord(checkpoint.scope_contract) && checkpoint.scope_contract.scope_id !== undefined)
    return checkpoint.scope_contract.scope_id;
  if (isPlainRecord(checkpoint.acceptance_manifest) && checkpoint.acceptance_manifest.scope !== undefined)
    return checkpoint.acceptance_manifest.scope;
  return null;
}
function validateAuthorityQuestionCandidates(checkpoint: JsonRecord, record: DecisionRecord): void {
  const candidates = checkpoint.question_candidates;
  if (!Array.isArray(candidates) || candidates.length > 256)
    fail('authority checkpoint questions are missing', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  denseArray(candidates, 'authority checkpoint questions');
  const ids = new Set<string>();
  candidates.forEach((item) => {
    const question = asRecord(item, 'authority question candidate');
    if (question.schema !== 'QuestionCandidate/v1')
      fail('authority question candidate schema is invalid', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    const questionId = text(question.question_id, 'authority question_id', 256);
    if (ids.has(questionId))
      fail('authority checkpoint contains duplicate questions', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    ids.add(questionId);
    if (question.work_id !== record.work_item_id || question.source_revision !== record.source_revision)
      fail('authority question candidate binding is stale or foreign', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    strings(question.targets, 'authority question targets', 64, 1, 512);
    const status = enumValue(question.status, ['open', 'answered'], 'authority question status');
    const answerValue = question.answer;
    if (answerValue === null || answerValue === undefined) {
      if (status === 'answered')
        fail('answered authority question has no answer', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
      return;
    }
    const answer = asRecord(answerValue, 'authority human answer');
    const outcome = enumValue(answer.outcome, ['decision', 'cannot_answer', 'defer'], 'authority answer outcome');
    strings(answer.selected ?? [], 'authority answer selected', 64, 0, 256);
    text(answer.quote, 'authority answer quote', 4096);
    safePointer(answer.pointer, 'authority answer pointer');
    date(answer.answered_at, 'authority answer timestamp');
    if (answer.actor !== undefined) safeActor(answer.actor, 'authority answer actor');
    if ((status === 'answered' && outcome !== 'decision') || (status === 'open' && outcome === 'decision'))
      fail('authority question answer status is inconsistent', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  });
}

function validateAuthorityCheckpointIdentity(
  checkpoint: JsonRecord,
  record: DecisionRecord,
  authority: DecisionAuthority,
): void {
  if (
    checkpoint.schema !== 'WorkCheckpoint/v2' ||
    checkpoint.work_id !== record.work_item_id ||
    checkpoint.source_revision !== record.source_revision ||
    !Number.isInteger(checkpoint.revision) ||
    Number(checkpoint.revision) < 1 ||
    checkpoint.protocol_version !== 'agent-development-runtime/v4' ||
    !['INTAKE', 'TRACE', 'PLAN', 'EXECUTE', 'VERIFY', 'DELIVERY', 'COMPLETE'].includes(
      String(checkpoint.lifecycle_state),
    )
  )
    fail('authority checkpoint is not a current WorkCheckpoint/v2', 'GAP-DECISION-AUTHORITY-001');
  if (checkpoint.lifecycle_state === 'COMPLETE')
    fail('authority checkpoint is already complete', 'GAP-DECISION-AUTHORITY-001');
  if (checkpointScopeId(checkpoint) !== record.scope_id)
    fail('authority checkpoint scope is stale or foreign', 'GAP-DECISION-AUTHORITY-001');
  if (!Number.isInteger(authority.checkpoint_revision) || authority.checkpoint_revision !== Number(checkpoint.revision))
    fail('authority checkpoint revision is missing or stale', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  if (authority.checkpoint_digest !== digest(checkpoint))
    fail('authority checkpoint digest is missing or stale', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  validateAuthorityQuestionCandidates(checkpoint, record);
}

function validateAcceptedAuthorityEvidence(
  root: string,
  feature: ResearchDecisionConfig,
  record: DecisionRecord,
  authority: DecisionAuthority,
  configuredPath?: string,
): void {
  const checkpoint = authorityCheckpoint(root, feature, record, configuredPath);
  validateAuthorityCheckpointIdentity(checkpoint, record, authority);
  if (record.decision_type === 'business') {
    if (
      !['user', 'owner'].includes(authority.kind) ||
      !new RegExp('^' + authority.kind + ':', 'i').test(authority.actor)
    )
      fail('business authority actor is not attributable', 'GAP-DECISION-AUTHORITY-001');
    const questionId = authorityFragment(authority.pointer, 'QuestionCandidate/v1', 'authority pointer');
    const answerId = authorityFragment(authority.proof, 'HumanAnswer/v1', 'authority proof');
    const question =
      ((checkpoint.question_candidates as unknown[]).find(
        (item) => isPlainRecord(item) && item.schema === 'QuestionCandidate/v1' && item.question_id === questionId,
      ) as JsonRecord | undefined) ?? null;
    const answerValue = question?.answer;
    const answer = isPlainRecord(answerValue) ? answerValue : null;
    const targetsValue = question?.targets;
    const targets = Array.isArray(targetsValue) ? targetsValue : [];
    const trace = [...record.br_ids, ...record.sr_ids, ...record.ac_ids];
    if (
      !question ||
      question.work_id !== record.work_item_id ||
      question.source_revision !== record.source_revision ||
      question.status !== 'answered' ||
      question.decision_owner !== 'user' ||
      !targets.some((target) => typeof target === 'string' && trace.includes(target)) ||
      !answer ||
      answer.outcome !== 'decision'
    )
      fail(
        'authority QuestionCandidate/HumanAnswer is missing or foreign to the decision trace',
        'GAP-DECISION-AUTHORITY-EVIDENCE-001',
      );
    const selected = Array.isArray(answer?.selected) ? answer.selected : [];
    if (selected.length !== 1 || selected[0] !== record.selected_option_id)
      fail('authority HumanAnswer selection does not match the decision option', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    const answerPointer = typeof answer?.pointer === 'string' ? answer.pointer : '';
    if (
      !(
        answerPointer === answerId ||
        answerPointer.endsWith('#' + answerId) ||
        answerPointer.endsWith('/' + answerId) ||
        answerPointer.endsWith(':' + answerId)
      )
    )
      fail('authority HumanAnswer pointer does not match checkpoint answer', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    if (!answer || answer.actor !== authority.actor)
      fail('authority HumanAnswer actor does not match the approving actor', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    if (authority.evidence_digest !== digest(question))
      fail('authority QuestionCandidate digest is missing or stale', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
    return;
  }
  const architect = isPlainRecord(checkpoint.architect_decision) ? checkpoint.architect_decision : null;
  const decisionId = authorityFragment(authority.pointer, 'ArchitectDecision/v1', 'authority pointer');
  const proofId = authorityFragment(authority.proof, 'ArchitectDecision/v1', 'authority proof');
  if (proofId !== decisionId)
    fail('authority ArchitectDecision proof does not match pointer', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  if (
    !architect ||
    architect.schema !== 'ArchitectDecision/v1' ||
    architect.decision_id !== decisionId ||
    architect.work_id !== record.work_item_id ||
    architect.source_revision !== record.source_revision ||
    architect.architect_id !== authority.actor
  )
    fail('authority ArchitectDecision is missing or foreign', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
  if (architect.decision !== record.statement)
    fail(
      'authority ArchitectDecision statement does not match the decision record',
      'GAP-DECISION-AUTHORITY-EVIDENCE-001',
    );
  if (!/^(?:architect|runtime):/i.test(authority.actor))
    fail('technical authority actor is not attributable', 'GAP-DECISION-AUTHORITY-001');
  if (authority.evidence_digest !== digest(architect))
    fail('authority ArchitectDecision digest is missing or stale', 'GAP-DECISION-AUTHORITY-EVIDENCE-001');
}

function canonicalEvidenceRelative(pointer: string, feature: ResearchDecisionConfig): string | null {
  if (pointer.includes('#') || pointer.includes('\\')) return null;
  const relative = pointer;
  const normalized = path.posix.normalize(relative);
  if (!relative || normalized !== relative || relative.startsWith('./') || relative.includes('//')) return null;
  const suffix = ['.research.json', '.synthesis.json', '.decision.json'].find((candidate) =>
    relative.endsWith(candidate),
  );
  if (!suffix) return null;
  const underResearch = relative.startsWith(feature.paths.research_records + '/');
  const underDecision = relative.startsWith(feature.paths.decision_records + '/');
  if ((suffix === '.research.json' || suffix === '.synthesis.json') && !underResearch) return null;
  if (suffix === '.decision.json' && !underDecision) return null;
  return relative;
}

function recordKindForRelative(relative: string): RecordKind | null {
  if (relative.endsWith('.research.json')) return 'research';
  if (relative.endsWith('.synthesis.json')) return 'synthesis';
  if (relative.endsWith('.decision.json')) return 'decision';
  return null;
}

function canonicalRecordPaths(feature: ResearchDecisionConfig, kind: RecordKind, value: JsonRecord): readonly string[] {
  const primary = recordPath(feature, kind, value);
  return kind === 'research' ? [primary, researchCollisionPath(feature, value)] : [primary];
}

function canonicalEvidenceClasses(kind: RecordKind, evidence: JsonRecord): ReadonlySet<string> {
  if (kind === 'decision') return new Set(['Decision']);
  if (kind === 'research') {
    return new Set(
      Array.isArray(evidence.evidence_classes)
        ? evidence.evidence_classes.filter((item): item is string => typeof item === 'string')
        : [],
    );
  }
  return new Set(
    Array.isArray(evidence.findings)
      ? evidence.findings.flatMap((item) =>
          isPlainRecord(item) && typeof item.evidence_class === 'string' ? [item.evidence_class] : [],
        )
      : [],
  );
}

function resolveCanonicalEvidence(
  root: string,
  feature: ResearchDecisionConfig,
  record: DecisionRecord,
  seen: ReadonlySet<string> = new Set(),
  context?: DecisionValidationContext,
): void {
  const stack = new Set(seen);
  if (context?.current_record_path) stack.add(context.current_record_path);
  record.evidence_refs.forEach((reference) => {
    const relative = canonicalEvidenceRelative(reference.pointer, feature);
    if (relative === null)
      fail('decision evidence pointer is not canonical: ' + reference.pointer, 'GAP-DECISION-EVIDENCE-CANONICAL-001');
    if (stack.has(relative)) fail('decision evidence cycle detected: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
    const kind = recordKindForRelative(relative);
    if (kind === null)
      fail('decision evidence suffix is not canonical: ' + relative, 'GAP-DECISION-EVIDENCE-CANONICAL-001');
    let evidence: JsonRecord;
    try {
      evidence = readJson(root, relative);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        fail('decision evidence is missing: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
      throw error;
    }
    const schema =
      kind === 'research' ? 'ResearchResult/v1' : kind === 'synthesis' ? 'ResearchSynthesis/v1' : 'DecisionRecord/v1';
    if (evidence.schema !== schema)
      fail('decision evidence schema does not match its suffix: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
    if (!canonicalRecordPaths(feature, kind, evidence).includes(relative))
      fail('decision evidence path is not canonical: ' + relative, 'GAP-DECISION-EVIDENCE-CANONICAL-001');
    if (evidence.digest !== reference.digest)
      fail('decision evidence digest is stale: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
    if (
      evidence.work_item_id !== record.work_item_id ||
      evidence.source_revision !== record.source_revision ||
      evidence.scope_id !== record.scope_id
    )
      fail('decision evidence is foreign or stale: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
    const identityField = kind === 'research' ? 'result_id' : kind === 'synthesis' ? 'bundle_id' : 'decision_id';
    const identity = evidence[identityField];
    if (typeof identity !== 'string' || reference.id !== identity)
      fail('decision evidence identity does not match: ' + relative, 'GAP-RESEARCH-EVIDENCE-001');
    if (!canonicalEvidenceClasses(kind, evidence).has(reference.kind))
      fail(
        'decision evidence class is not proven by the canonical record: ' + relative,
        'GAP-RESEARCH-EVIDENCE-PROVENANCE-001',
      );
    const nextSeen = new Set(stack);
    nextSeen.add(relative);
    const evidenceContext = context
      ? { ...context, current_record_path: relative, evidence_stack: nextSeen }
      : {
          root,
          feature,
          authority_checkpoint_path: undefined,
          current_record_path: relative,
          evidence_stack: nextSeen,
        };
    if (kind === 'research') validateResult(evidence, evidenceContext);
    else if (kind === 'synthesis') {
      const synthesis = validateSynthesis(evidence, evidenceContext);
      validateSynthesisReferences(root, feature, synthesis);
      validateSynthesisExternalValidation(root, feature, synthesis);
    } else validateDecision(evidence, evidenceContext);
  });
}

function validateRevisit(value: unknown): void {
  if (value === null || value === undefined) return;
  const revisit = asRecord(value, 'decision revisit');
  exactKeys(revisit, REVISIT_KEYS, 'decision revisit');
  text(revisit.trigger, 'revisit trigger', 256);
  text(revisit.condition, 'revisit condition', 2048);
}

function validateInstructionEntry(value: unknown): ResearchDecisionInstruction {
  const item = asRecord(value, 'instruction');
  const allowed = new Set([
    'instruction_id',
    'owner',
    'revision',
    'source_path',
    'source_sha256',
    'summary_sha256',
    'activation_class',
    'triggers',
    'phases',
    'lanes',
    'output_schema',
    'max_bytes',
    'privacy',
    'status',
    'content',
  ]);
  exactKeys(item, allowed, 'instruction');
  id(item.instruction_id, 'instruction_id');
  text(item.owner, 'instruction owner', 256);
  if (!Number.isInteger(item.revision) || Number(item.revision) < 1) fail('instruction revision invalid');
  const sourcePath = safePointer(item.source_path, 'instruction source_path');
  if (!/^agent-runtime\.config\.v1\.yaml#research_decision\.registry\.instructions\.[0-9]+$/.test(sourcePath))
    fail('instruction source binding escapes candidate authority', 'GAP-INSTRUCTION-REGISTRY-SECURITY-001');
  const sourceDigest = hash(item.source_sha256, 'instruction source_sha256');
  const summaryDigest = hash(item.summary_sha256, 'instruction summary_sha256');
  const activationClass = enumValue(item.activation_class, ACTIVE_CLASSES, 'activation_class');
  strings(item.triggers, 'instruction triggers', 32, 0, 128).forEach((trigger) => {
    if (!/^[a-z][a-z0-9._-]{0,127}$/.test(trigger)) fail('instruction trigger invalid');
  });
  strings(item.phases, 'instruction phases', 16, 0, 128).forEach((phase) => {
    if (!/^[a-z][a-z0-9._-]{0,127}$/.test(phase)) fail('instruction phase invalid');
  });
  strings(item.lanes, 'instruction lanes', 16, 0, 128).forEach((lane) => {
    if (!/^[a-z][a-z0-9._-]{0,127}$/.test(lane)) fail('instruction lane invalid');
  });
  text(item.output_schema, 'instruction output_schema', 256);
  if (!/^[A-Za-z][A-Za-z0-9]+\/v1$/.test(item.output_schema as string)) fail('instruction output_schema invalid');
  if (!Number.isInteger(item.max_bytes) || Number(item.max_bytes) < 1024 || Number(item.max_bytes) > 4 * 1024 * 1024)
    fail('instruction max_bytes invalid');
  const privacy = enumValue(item.privacy, ['public', 'internal', 'sensitive_redacted'], 'instruction privacy');
  const status = enumValue(item.status, ['active', 'disabled'], 'instruction status');
  const content = text(item.content, 'instruction content', 65_536);
  if (Buffer.byteLength(content, 'utf8') > Number(item.max_bytes))
    fail('instruction content exceeds max_bytes', 'GAP-INSTRUCTION-SOURCE-BOUND-001');
  if (content.includes('/vida-'))
    fail('instruction content contains forbidden command alias', 'GAP-INSTRUCTION-REGISTRY-SECURITY-001');
  if (sha256(content) !== sourceDigest) fail('instruction source digest mismatch', 'GAP-INSTRUCTION-SOURCE-STALE-001');
  if (sha256(content.slice(0, 512)) !== summaryDigest)
    fail('instruction summary digest mismatch', 'GAP-INSTRUCTION-SOURCE-STALE-001');
  return {
    instruction_id: item.instruction_id as string,
    owner: item.owner as string,
    revision: Number(item.revision),
    source_path: sourcePath,
    source_sha256: sourceDigest,
    summary_sha256: summaryDigest,
    activation_class: activationClass,
    triggers: item.triggers as readonly string[],
    phases: item.phases as readonly string[],
    lanes: item.lanes as readonly string[],
    output_schema: item.output_schema as string,
    max_bytes: Number(item.max_bytes),
    privacy,
    status,
    content,
  };
}

export function registryDigest(registry: InstructionRegistry): string {
  return digest(Object.fromEntries(Object.entries(registry).filter(([key]) => key !== 'digest')));
}

export function validateInstructionRegistry(value: unknown): InstructionRegistry {
  const registry = asRecord(value, 'instruction registry');
  if (registry.schema !== 'InstructionRegistry/v1')
    fail('instruction registry schema invalid', 'GAP-INSTRUCTION-REGISTRY-001');
  exactKeys(registry, RECORD_KEYS.registry, 'instruction registry');
  optionalSchema(registry.$schema, 'InstructionRegistry');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/.test(text(registry.registry_id, 'registry_id', 256)))
    fail('registry_id invalid');
  if (!Number.isInteger(registry.revision) || Number(registry.revision) < 1) fail('registry revision invalid');
  text(registry.source_revision, 'registry source_revision', 2048);
  date(registry.updated_at, 'registry updated_at');
  const instructionValues = registry.instructions;
  if (!Array.isArray(instructionValues) || instructionValues.length < 1 || instructionValues.length > 64)
    fail('registry instructions invalid');
  denseArray(instructionValues, 'registry instructions');
  const seen = new Set<string>();
  const instructions = instructionValues.map((item) => {
    const instruction = validateInstructionEntry(item);
    if (seen.has(instruction.instruction_id)) fail('registry contains duplicate instruction');
    seen.add(instruction.instruction_id);
    return instruction;
  });
  const base = {
    schema: 'InstructionRegistry/v1' as const,
    registry_id: registry.registry_id as string,
    revision: Number(registry.revision),
    source_revision: registry.source_revision as string,
    instructions,
    updated_at: registry.updated_at as string,
    digest: hash(registry.digest, 'registry digest'),
  };
  const result = registry.$schema === undefined ? base : { $schema: text(registry.$schema, '$schema', 2048), ...base };
  if (registryDigest(result) !== result.digest)
    fail('instruction registry digest mismatch', 'GAP-INSTRUCTION-REGISTRY-DIGEST-001');
  return result;
}

function settings(root: string): ResearchDecisionConfig {
  const config: AgentRuntimeConfig = loadRuntimeConfig(root);
  return config.research_decision;
}
type ResearchConfigSnapshot = Readonly<{ feature: ResearchDecisionConfig; digest: string }>;
function researchConfigSnapshot(root: string): ResearchConfigSnapshot {
  const config = loadRuntimeConfig(root);
  return { feature: config.research_decision, digest: runtimeConfigDigest(config) };
}
function currentResearchFeature(root: string, expectedDigest: string): ResearchDecisionConfig {
  const config = loadRuntimeConfig(root);
  if (runtimeConfigDigest(config) !== expectedDigest)
    fail('research decision configuration changed during persistence', 'GAP-RESEARCH-DECISION-CONFIG-001');
  return config.research_decision;
}
function requireStableResearchPath(expected: string, actual: string, label: string): void {
  if (expected !== actual)
    fail('research decision ' + label + ' path changed during persistence', 'GAP-RESEARCH-DECISION-CONFIG-001');
}

function compareIdentifiers(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function activationTriggers(input: ActivationContextInput): readonly string[] {
  let explicit: readonly string[] = [];
  if (input.triggers !== undefined) {
    if (!Array.isArray(input.triggers)) fail('activation triggers invalid', 'GAP-INSTRUCTION-CONTEXT-001');
    denseArray(input.triggers, 'activation triggers');
    explicit = input.triggers.map((trigger, index) =>
      enumValue(trigger, [...KNOWN_TRIGGERS], 'activation trigger ' + index, 'GAP-INSTRUCTION-CONTEXT-001'),
    );
  }
  const inferred = typeof input.intent === 'string' && KNOWN_TRIGGERS.has(input.intent) ? [input.intent] : [];
  if (input.closeout !== undefined && typeof input.closeout !== 'boolean')
    fail('activation closeout invalid', 'GAP-INSTRUCTION-CONTEXT-001');
  if (input.closeout === true) inferred.push('closeout');
  return [...new Set([...explicit, ...inferred])].sort(compareIdentifiers);
}

function scalarText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function contextSafeText(value: unknown, name: string, maximum = 2048): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    /[\r\n]|(?:password|secret|token|apikey|authorization|bearer)/i.test(value)
  )
    fail(name + ' is unsafe', 'GAP-INSTRUCTION-CONTEXT-PRIVACY-001');
  return value;
}
function contextString(
  input: ActivationContextInput,
  keys: readonly (keyof ActivationContextInput)[],
  defaultValue: string,
): string {
  for (const key of keys) {
    const raw = input[key];
    if (raw !== undefined) {
      if (typeof raw !== 'string') fail('activation ' + key + ' must be a string', 'GAP-INSTRUCTION-CONTEXT-001');
      return contextSafeText(raw, 'activation ' + key);
    }
  }
  return defaultValue;
}

function sanitizeSourceBindings(value: unknown): Readonly<Record<string, string | readonly string[]>> {
  if (!isPlainRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, item]) =>
          /^(br|sr|ac|gap|source|record|scope|work|revision|digest|pointer|id)/i.test(key) &&
          (typeof item === 'string' || Array.isArray(item)),
      )
      .map(([key, item]) => [
        key,
        Array.isArray(item)
          ? item
              .slice(0, 32)
              .map((entry, index) =>
                contextSafeText(entry, 'activation source binding ' + key + '[' + index + ']', 512),
              )
          : contextSafeText(item, 'activation source binding ' + key, 512),
      ]),
  );
}
function contextValue(input: ActivationContextInput): ActivationContext {
  const phaseAlias = scalarText(input.phase);
  const lifecyclePhaseAlias = scalarText(input.lifecycle_phase);
  if (phaseAlias && lifecyclePhaseAlias && phaseAlias !== lifecyclePhaseAlias)
    fail('activation phase aliases conflict', 'GAP-INSTRUCTION-CONTEXT-001');
  const requiredInstructionIds =
    input.required_instruction_ids === undefined
      ? []
      : strings(input.required_instruction_ids, 'required_instruction_ids', 64, 0, 128).map((item) =>
          id(item, 'required instruction_id'),
        );
  const value = {
    intent: contextString(input, ['intent'], 'unknown'),
    risk: contextString(input, ['risk'], 'low'),
    lane: contextString(input, ['lane'], 'runtime'),
    phase: enumValue(
      contextString(input, ['lifecycle_phase', 'phase'], 'trace'),
      ACTIVATION_PHASES,
      'activation phase',
      'GAP-INSTRUCTION-CONTEXT-001',
    ),
    contour: contextString(input, ['contour', 'scope_id'], 'unknown'),
    scope_id: contextString(input, ['scope_id', 'contour'], 'unknown'),
    work_item_id: contextString(input, ['work_item_id'], 'unknown'),
    source_revision: contextString(input, ['source_revision'], 'unknown'),
    artifact_kind: contextString(input, ['artifact_kind'], 'none'),
    triggers: activationTriggers(input),
    source_bindings: sanitizeSourceBindings(input.source_bindings),
    required_instruction_ids: requiredInstructionIds,
  };
  if (!['low', 'medium', 'high'].includes(value.risk)) fail('activation risk invalid', 'GAP-INSTRUCTION-CONTEXT-001');
  return value;
}

function contextShape(input: unknown, maximum: number): ActivationContext {
  if (!isPlainRecord(input)) fail('instruction activation context required', 'GAP-INSTRUCTION-CONTEXT-001');
  const allowed = new Set([
    'intent',
    'risk',
    'lane',
    'lifecycle_phase',
    'phase',
    'contour',
    'scope_id',
    'work_item_id',
    'source_revision',
    'artifact_kind',
    'triggers',
    'closeout',
    'source_bindings',
    'required_instruction_ids',
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key)))
    fail('activation context contains unsupported fields', 'GAP-INSTRUCTION-CONTEXT-001');
  const context = contextValue(input as ActivationContextInput);
  if (Buffer.byteLength(canonicalJson(context), 'utf8') > maximum)
    fail('activation context exceeds byte bound', 'GAP-INSTRUCTION-CONTEXT-BOUND-001');
  return context;
}

function activationMatches(
  instruction: ResearchDecisionInstruction,
  context: Pick<ActivationContext, 'phase' | 'lane' | 'triggers'>,
): boolean {
  const dimensionsMatch = (values: readonly string[], current: string): boolean =>
    values.length === 0 || values.includes(current) || values.includes('*');
  if (!dimensionsMatch(instruction.phases, context.phase) || !dimensionsMatch(instruction.lanes, context.lane))
    return false;
  if (instruction.activation_class === 'always_on') return true;
  return (
    instruction.triggers.some((trigger) => context.triggers.includes(trigger)) ||
    (instruction.activation_class === 'closure_reflection' &&
      ['verify', 'delivery', 'closeout'].includes(context.phase))
  );
}

function mandatoryInstructionIds(context: ActivationContext): readonly string[] {
  const required = new Set<string>(['dynamic-instruction-activation']);
  if (context.triggers.some((trigger) => ['research_intent', 'domain_question'].includes(trigger)))
    required.add('research-protocol');
  if (context.triggers.some((trigger) => ['external_fact', 'api_assumption', 'provider_change'].includes(trigger)))
    required.add('web-validation-protocol');
  if (context.triggers.some((trigger) => ['option_selection', 'decision_needed'].includes(trigger)))
    required.add('decision-recording-protocol');
  if (
    context.triggers.some((trigger) => ['supersession', 'correction', 'closeout'].includes(trigger)) ||
    (['verify', 'delivery', 'closeout'].includes(context.phase) &&
      context.triggers.some((trigger) => ['conflict', 'material_gap'].includes(trigger)))
  )
    required.add('decision-closure-reflection');
  return [...required];
}

function completenessActivationGaps(
  context: ActivationContext,
  bindings: readonly InstructionBinding[],
): readonly InstructionActivationCompletenessGap[] {
  const triggers = context.triggers.filter((trigger) => ['conflict', 'material_gap'].includes(trigger));
  const closure = bindings.some((binding) => binding.activation_class === 'closure_reflection');
  return triggers.length > 0 && !closure
    ? [{ code: 'GAP-INSTRUCTION-COMPLETENESS-001', triggers, blocking: true }]
    : [];
}

function activationBinding(instruction: ResearchDecisionInstruction, context: ActivationContext): InstructionBinding {
  const payload = Buffer.from(instruction.content, 'utf8').subarray(0, instruction.max_bytes).toString('utf8');
  const matched = instruction.triggers.filter((trigger) => context.triggers.includes(trigger));
  const reason =
    instruction.activation_class === 'always_on'
      ? 'always_on trace and evidence contract'
      : 'typed trigger match: ' + (matched.join(',') || context.phase);
  return {
    instruction_id: instruction.instruction_id,
    revision: instruction.revision,
    owner: instruction.owner,
    activation_class: instruction.activation_class,
    source_path: instruction.source_path,
    source_sha256: instruction.source_sha256,
    summary_sha256: instruction.summary_sha256,
    output_schema: instruction.output_schema,
    privacy: instruction.privacy,
    reason,
    pointer: instruction.source_path + '#dynamic-activation',
    payload,
    context: {
      lane: context.lane,
      phase: context.phase,
      trigger: matched[0] ?? (instruction.activation_class === 'always_on' ? 'always_on' : context.phase),
    },
  };
}

interface ActivationCache {
  readonly schema: 'InstructionActivationCache/v1';
  readonly cache_key: string;
  readonly registry_digest: string;
  readonly registry_revision: number;
  readonly context_digest: string;
  readonly instruction_ids: readonly string[];
  readonly source_digests: readonly { readonly instruction_id: string; readonly source_sha256: string }[];
  readonly created_at: string;
}

function cacheRead(root: string, relative: string): ActivationCache | null {
  try {
    const value = readJson(root, relative);
    const cacheKeys = new Set([
      'schema',
      'cache_key',
      'registry_digest',
      'registry_revision',
      'context_digest',
      'instruction_ids',
      'source_digests',
      'created_at',
    ]);
    const cacheCreatedAt = typeof value.created_at === 'string' ? rfc3339TimestampMilliseconds(value.created_at) : null;
    const sourceDigestKeys = new Set(['instruction_id', 'source_sha256']);
    const instructionIds = value.instruction_ids;
    const sourceDigests = value.source_digests;
    const validInstructionIds =
      Array.isArray(instructionIds) &&
      instructionIds.length <= 64 &&
      Array.from({ length: instructionIds.length }, (_, index) => index).every((index) =>
        Object.hasOwn(instructionIds, index),
      ) &&
      instructionIds.every((item) => typeof item === 'string' && RESULT_ID.test(item));
    const validSourceDigests =
      Array.isArray(sourceDigests) &&
      sourceDigests.length <= 64 &&
      Array.from({ length: sourceDigests.length }, (_, index) => index).every((index) =>
        Object.hasOwn(sourceDigests, index),
      ) &&
      sourceDigests.every(
        (item) =>
          isPlainRecord(item) &&
          Object.keys(item).length === sourceDigestKeys.size &&
          Object.keys(item).every((key) => sourceDigestKeys.has(key)) &&
          typeof item.instruction_id === 'string' &&
          RESULT_ID.test(item.instruction_id) &&
          typeof item.source_sha256 === 'string' &&
          DIGEST.test(item.source_sha256),
      );
    const valid =
      value.schema === 'InstructionActivationCache/v1' &&
      Object.keys(value).every((key) => cacheKeys.has(key)) &&
      typeof value.cache_key === 'string' &&
      DIGEST.test(value.cache_key) &&
      typeof value.registry_digest === 'string' &&
      DIGEST.test(value.registry_digest) &&
      Number.isInteger(value.registry_revision) &&
      Number(value.registry_revision) >= 1 &&
      typeof value.context_digest === 'string' &&
      DIGEST.test(value.context_digest) &&
      validInstructionIds &&
      validSourceDigests &&
      cacheCreatedAt !== null &&
      cacheCreatedAt <= Date.now() + 300_000;
    if (!valid) return null;
    return value as unknown as ActivationCache;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return null;
    if (
      error instanceof ResearchDecisionError &&
      ['GAP-RESEARCH-DECISION-PATH-001', 'GAP-RESEARCH-DECISION-SOURCE-001'].includes(error.code)
    )
      return null;
    throw error;
  }
}

function cacheKey(registry: InstructionRegistry, context: ActivationContext): string {
  return digest({ registry_digest: registry.digest, revision: registry.revision, context });
}

function cacheWrite(
  root: string,
  relative: string,
  registry: InstructionRegistry,
  context: ActivationContext,
  bindings: readonly InstructionBinding[],
): ActivationCache {
  const value: ActivationCache = {
    schema: 'InstructionActivationCache/v1',
    cache_key: cacheKey(registry, context),
    registry_digest: registry.digest,
    registry_revision: registry.revision,
    context_digest: digest(context),
    instruction_ids: bindings.map((item) => item.instruction_id),
    source_digests: bindings.map((item) => ({
      instruction_id: item.instruction_id,
      source_sha256: item.source_sha256,
    })),
    created_at: new Date().toISOString(),
  };
  writeAtomic(root, relative, JSON.stringify(value, null, 2) + '\n');
  return value;
}

export function resolveInstructionActivation(
  input: unknown,
  options: ResearchDecisionRecordOptions = {},
): InstructionActivationResolution {
  const root = requiredResearchRoot(options);
  const gate = options.write_cache === false ? null : requireResearchWriteGate(options, root);
  const snapshot = researchConfigSnapshot(root);
  const feature = snapshot.feature;
  const context = contextShape(input, feature.limits.max_context_bytes);
  const registry = validateInstructionRegistry(cloneJson(feature.registry));
  const key = cacheKey(registry, context);
  const cache = cacheRead(root, feature.paths.cache);
  const selected = registry.instructions
    .filter((instruction) => instruction.status === 'active' && activationMatches(instruction, context))
    .sort(
      (left, right) =>
        CLASS_ORDER[left.activation_class] - CLASS_ORDER[right.activation_class] ||
        compareIdentifiers(left.instruction_id, right.instruction_id),
    );
  if (
    context.artifact_kind === 'synthesis' &&
    !selected.some((instruction) => instruction.output_schema === 'ResearchSynthesis/v1')
  )
    fail('synthesis activation has no supporting output instruction', 'GAP-INSTRUCTION-USE-REGISTRY-001');
  const bindings = selected.map((instruction) => activationBinding(instruction, context));
  const requiredIds = [...new Set([...mandatoryInstructionIds(context), ...context.required_instruction_ids])];
  const gaps: readonly InstructionActivationGap[] = [
    ...requiredIds
      .filter((instructionId) => !bindings.some((binding) => binding.instruction_id === instructionId))
      .map((instruction_id) => ({
        code: 'GAP-INSTRUCTION-MISSING-001' as const,
        instruction_id,
        blocking: true as const,
      })),
    ...completenessActivationGaps(context, bindings),
  ];
  const cacheMatchesCurrent = (candidate: ActivationCache | null): boolean => {
    const candidateCreatedAt = candidate === null ? null : rfc3339TimestampMilliseconds(candidate.created_at);
    return (
      candidate !== null &&
      candidate.cache_key === key &&
      candidate.registry_digest === registry.digest &&
      candidate.registry_revision === registry.revision &&
      candidate.context_digest === digest(context) &&
      candidateCreatedAt !== null &&
      candidateCreatedAt <= Date.now() + 300_000 &&
      candidate.instruction_ids.join('|') === bindings.map((binding) => binding.instruction_id).join('|') &&
      candidate.source_digests.length === bindings.length &&
      candidate.source_digests.every(
        (item, index) =>
          item.instruction_id === bindings[index]?.instruction_id &&
          item.source_sha256 === bindings[index]?.source_sha256,
      )
    );
  };
  const cacheMatches = cacheMatchesCurrent(cache);
  let cacheStatus: 'hit' | 'cold' | 'refreshed' = cacheMatches ? 'hit' : 'cold';
  if (!cacheMatches && options.write_cache !== false) {
    let previousCache: string | null | undefined;
    let changed = false;
    gate!.store.withWorkingMutation(
      root,
      gate!.generation,
      () =>
        withLock(root, feature.paths.cache, () => {
          const access = repositoryAccess(root);
          previousCache = access.fileExists(feature.paths.cache, 'activation cache')
            ? access.readText(feature.paths.cache, 'activation cache')
            : null;
          {
            const currentFeature = currentResearchFeature(root, snapshot.digest);
            requireStableResearchPath(feature.paths.cache, currentFeature.paths.cache, 'cache');
            const lockedCache = cacheRead(root, feature.paths.cache);
            if (cacheMatchesCurrent(lockedCache)) cacheStatus = 'hit';
            else {
              changed = true;
              cacheWrite(root, feature.paths.cache, registry, context, bindings);
              cacheStatus = 'refreshed';
            }
            currentResearchFeature(root, snapshot.digest);
          }
        }),
      () => {
        if (changed && previousCache !== undefined) restoreResearchFiles(root, [[feature.paths.cache, previousCache]]);
      },
    );
  }
  currentResearchFeature(root, snapshot.digest);
  const result: InstructionActivationResolution = {
    schema: 'InstructionActivationResolution/v1',
    registry_id: registry.registry_id,
    registry_revision: registry.revision,
    registry_digest: registry.digest,
    context_digest: digest(context),
    context,
    bindings,
    gaps,
    cache_status: cacheStatus,
    deterministic_order: bindings.map((binding) => binding.instruction_id),
  };
  if (Buffer.byteLength(canonicalJson(result), 'utf8') > feature.limits.max_projection_bytes)
    fail('instruction activation projection exceeds byte bound', 'GAP-INSTRUCTION-CONTEXT-BOUND-001');
  return frozen(result);
}

function normalizeActivationUse(input: unknown): JsonRecord {
  const value = cloneJson(isPlainRecord(input) ? input : {});
  const suppliedDigest = value.digest;
  if (!value.schema) value.schema = 'InstructionActivationUse/v1';
  if (!value.use_id) value.use_id = 'use-' + (scalarText(value.work_item_id) ?? 'work') + '-' + Date.now();
  if (!value.timestamp) value.timestamp = new Date().toISOString();
  delete value.digest;
  const computedDigest = recordDigest(value);
  if (suppliedDigest !== undefined && suppliedDigest !== computedDigest)
    fail('InstructionActivationUse digest mismatch', 'GAP-RESEARCH-DECISION-DIGEST-001');
  value.digest = computedDigest;
  return value;
}

function activationHistoryRelative(feature: ResearchDecisionConfig, workItemId: string): string {
  return path.posix.join(
    feature.paths.activation_history,
    safeSegment(workItemId, 'activation work_item_id'),
    'instruction-activation-history.jsonl',
  );
}

function readActivationHistory(root: string, feature: ResearchDecisionConfig, workItemId: string): ActivationUse[] {
  const relative = activationHistoryRelative(feature, workItemId);
  const access = repositoryAccess(root);
  if (!access.fileExists(relative, 'activation history')) return [];
  const content = access.readText(relative, 'activation history');
  if (Buffer.byteLength(content, 'utf8') > MAX_JSON_BYTES)
    fail('instruction activation history exceeds bound', 'GAP-INSTRUCTION-USE-BOUND-001');
  const uses = content
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        fail('instruction activation history is corrupt', 'GAP-INSTRUCTION-USE-HISTORY-001');
      }
      return validateActivationUse(parsed);
    });
  const useIds = new Set<string>();
  for (const use of uses) {
    if (useIds.has(use.use_id))
      fail('instruction activation history contains duplicate use_id', 'GAP-INSTRUCTION-USE-HISTORY-001');
    useIds.add(use.use_id);
  }
  return uses;
}

export function validateActivationUse(input: unknown): ActivationUse {
  const value = asRecord(input, 'InstructionActivationUse');
  if (value.schema !== 'InstructionActivationUse/v1') fail('InstructionActivationUse schema invalid');
  exactKeys(value, RECORD_KEYS.use, 'InstructionActivationUse');
  optionalSchema(value.$schema, 'InstructionActivationUse');
  id(value.use_id, 'use_id', USE_ID);
  text(value.work_item_id, 'use work_item_id', 256);
  text(value.source_revision, 'use source_revision', 2048);
  text(value.scope_id, 'use scope_id', 512);
  enumValue(value.risk, ['low', 'medium', 'high'], 'use risk');
  enumValue(value.phase, ACTIVATION_PHASES, 'use phase', 'GAP-INSTRUCTION-USE-001');
  text(value.lane, 'use lane', 128);
  enumValue(value.trigger, [...RESEARCH_ACTIVATION_TRIGGERS, ...DECISION_ACTIVATION_TRIGGERS], 'use trigger');
  strings(value.required_instruction_ids, 'use required_instruction_ids', 64, 0, 128).forEach((item) => {
    id(item, 'use required instruction_id');
  });
  const instructionIds = strings(value.instruction_ids, 'use instruction_ids', 64, 1, 128);
  hash(value.registry_digest, 'use registry_digest');
  if (
    !Array.isArray(value.source_digests) ||
    value.source_digests.length < 1 ||
    value.source_digests.length > 64 ||
    Array.from({ length: value.source_digests.length }, (_, index) => index).some(
      (index) => !Object.hasOwn(value.source_digests as object, index),
    )
  )
    fail('use source_digests invalid');
  const sourceIds = new Set<string>();
  value.source_digests.forEach((item) => {
    const source = asRecord(item, 'use source digest');
    exactKeys(source, new Set(['instruction_id', 'source_sha256']), 'use source digest');
    const instructionId = id(source.instruction_id, 'use source instruction_id');
    if (sourceIds.has(instructionId)) fail('use source_digests contains duplicates');
    if (!instructionIds.includes(instructionId))
      fail('use source_digests contains an unselected instruction', 'GAP-INSTRUCTION-USE-BINDING-001');
    sourceIds.add(instructionId);
    hash(source.source_sha256, 'use source_sha256');
  });
  if (sourceIds.size !== instructionIds.length)
    fail('use source_digests are incomplete', 'GAP-INSTRUCTION-USE-BINDING-001');
  enumValue(value.cache_status, CACHE_STATUSES, 'use cache_status');
  safeActor(value.actor, 'use actor');
  safePointer(value.pointer, 'use pointer');
  date(value.timestamp, 'use timestamp');
  assertDigest(value, 'InstructionActivationUse');
  void instructionIds;
  return value as unknown as ActivationUse;
}

function validateActivationUseRegistry(value: ActivationUse, registry: InstructionRegistry): void {
  if (value.registry_digest !== registry.digest)
    fail('activation use registry digest is stale', 'GAP-INSTRUCTION-USE-REGISTRY-001');
  const context = contextValue({
    intent: value.trigger,
    risk: value.risk,
    lane: value.lane,
    phase: value.phase,
    lifecycle_phase: value.phase,
    contour: value.scope_id,
    scope_id: value.scope_id,
    work_item_id: value.work_item_id,
    source_revision: value.source_revision,
    artifact_kind: DECISION_ACTIVATION_TRIGGERS.includes(value.trigger as (typeof DECISION_ACTIVATION_TRIGGERS)[number])
      ? 'decision'
      : value.phase === 'plan' && value.lane === 'synthesizer'
        ? 'synthesis'
        : 'research',
    triggers: [value.trigger],
    required_instruction_ids: value.required_instruction_ids,
  });
  const selected = registry.instructions
    .filter((instruction) => instruction.status === 'active' && activationMatches(instruction, context))
    .sort(
      (left, right) =>
        CLASS_ORDER[left.activation_class] - CLASS_ORDER[right.activation_class] ||
        compareIdentifiers(left.instruction_id, right.instruction_id),
    );
  if (
    context.artifact_kind === 'synthesis' &&
    !selected.some((instruction) => instruction.output_schema === 'ResearchSynthesis/v1')
  )
    fail('synthesis activation has no supporting output instruction', 'GAP-INSTRUCTION-USE-REGISTRY-001');
  const required = [...new Set([...mandatoryInstructionIds(context), ...context.required_instruction_ids])];
  if (required.some((instructionId) => !selected.some((instruction) => instruction.instruction_id === instructionId)))
    fail('activation use is missing a mandatory instruction', 'GAP-INSTRUCTION-USE-REGISTRY-001');
  const expectedIds = selected.map((instruction) => instruction.instruction_id);
  const expectedSourceDigests = selected.map((instruction) => ({
    instruction_id: instruction.instruction_id,
    source_sha256: instruction.source_sha256,
  }));
  if (
    canonicalJson(value.required_instruction_ids) !== canonicalJson(context.required_instruction_ids) ||
    canonicalJson(value.instruction_ids) !== canonicalJson(expectedIds) ||
    canonicalJson(value.source_digests) !== canonicalJson(expectedSourceDigests)
  )
    fail('activation use does not match deterministic registry resolution', 'GAP-INSTRUCTION-USE-REGISTRY-001');
}

function activationCheckpointRevision(root: string, feature: ResearchDecisionConfig, workItemId: string): number {
  const relative = path.posix.join(
    feature.paths.activation_history,
    safeSegment(workItemId, 'activation work_item_id'),
    'resume.json',
  );
  if (!repositoryAccess(root).fileExists(relative, 'activation checkpoint'))
    fail('activation use expected revision cannot be verified', 'GAP-INSTRUCTION-USE-CAS-001');
  const checkpoint = readJson(root, relative);
  const revision = checkpoint.revision ?? checkpoint.checkpoint_revision;
  if (!Number.isInteger(revision) || Number(revision) < 1)
    fail('activation checkpoint revision is invalid', 'GAP-INSTRUCTION-USE-CAS-001');
  return Number(revision);
}

export function recordInstructionActivationUse(
  input: unknown,
  options: ResearchDecisionRecordOptions = {},
): ActivationUseResult {
  const root = requiredResearchRoot(options);
  const gate = requireResearchWriteGate(options, root);
  const value = validateActivationUse(normalizeActivationUse(input));
  safeSegment(value.work_item_id, 'use work_item_id');
  if (
    options.expectedRevision !== undefined &&
    (!Number.isInteger(options.expectedRevision) || options.expectedRevision < 1)
  )
    fail('activation use expected revision invalid', 'GAP-INSTRUCTION-USE-CAS-001');
  const snapshot = researchConfigSnapshot(root);
  const feature = snapshot.feature;
  const relative = activationHistoryRelative(feature, value.work_item_id);
  let undo: string | null | undefined;
  const write = () =>
    withLock(root, relative, () => {
      const currentFeature = currentResearchFeature(root, snapshot.digest);
      requireStableResearchPath(
        relative,
        activationHistoryRelative(currentFeature, value.work_item_id),
        'activation history',
      );
      validateActivationUseRegistry(value, currentFeature.registry);
      if (
        options.expectedRevision !== undefined &&
        activationCheckpointRevision(root, currentFeature, value.work_item_id) !== options.expectedRevision
      )
        fail('activation use expected revision is stale', 'GAP-INSTRUCTION-USE-CAS-001');
      const history = readActivationHistory(root, currentFeature, value.work_item_id);
      const same = history.find((candidate) => candidate.use_id === value.use_id);
      if (same) {
        validateActivationUseRegistry(same, currentFeature.registry);
        if (same.digest !== value.digest)
          fail('activation use replay digest mismatch', 'GAP-INSTRUCTION-USE-REPLAY-001');
        return { recorded: false, replay: true, use: same, path: relative };
      }
      const activationContext = contextValue({
        intent: value.trigger,
        risk: value.risk,
        lane: value.lane,
        phase: value.phase,
        lifecycle_phase: value.phase,
        contour: value.scope_id,
        scope_id: value.scope_id,
        work_item_id: value.work_item_id,
        source_revision: value.source_revision,
        artifact_kind: DECISION_ACTIVATION_TRIGGERS.includes(
          value.trigger as (typeof DECISION_ACTIVATION_TRIGGERS)[number],
        )
          ? 'decision'
          : 'research',
        triggers: [value.trigger],
        required_instruction_ids: value.required_instruction_ids,
      });
      const resolution = resolveInstructionActivation(activationContext, { root, write_cache: false });
      const blocking = resolution.gaps.filter((gap) => gap.blocking === true);
      if (blocking.length > 0)
        fail('activation use has a blocking resolver gap: ' + blocking[0]!.code, 'GAP-INSTRUCTION-USE-REGISTRY-001');
      // A resolver that refreshes the cache reports "refreshed" to its caller.
      // The independent validation lookup necessarily observes that persisted
      // cache as "hit". Treat the two states as one successful handoff.
      const cacheStatusMatches =
        value.cache_status === resolution.cache_status ||
        (value.cache_status === 'refreshed' && resolution.cache_status === 'hit');
      if (!cacheStatusMatches)
        fail('activation use cache_status does not match current resolution', 'GAP-INSTRUCTION-USE-CACHE-001');
      ensureDirectory(root, path.posix.dirname(relative));
      const access = repositoryAccess(root);
      const previous = access.fileExists(relative, 'activation history')
        ? access.readText(relative, 'activation history')
        : null;
      undo = previous;
      const prior = previous ?? '';
      writeAtomic(root, relative, prior + JSON.stringify(value) + '\n');
      currentResearchFeature(root, snapshot.digest);
      return { recorded: true, replay: false, use: value, path: relative };
    });
  const result = gate.store.withWorkingMutation(
    root,
    gate.generation,
    () =>
      options.expectedRevision !== undefined
        ? withOrderedLocks(
            root,
            [
              path.posix.join(
                feature.paths.activation_history,
                safeSegment(value.work_item_id, 'activation work_item_id'),
                'resume.json',
              ),
            ],
            write,
          )
        : write(),
    () => {
      if (undo !== undefined) restoreResearchFiles(root, [[relative, undo]]);
    },
  );
  currentResearchFeature(root, snapshot.digest);
  return result;
}

function slug(value: unknown, defaultValue: string): string {
  const normalized = scalarText(value) ?? '';
  const candidate = normalized
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return RESULT_ID.test(candidate) ? candidate : defaultValue;
}

function topicSlug(value: unknown, prefix: string): string {
  const source = scalarText(value) ?? '';
  return slug(source, prefix + '-' + digest(source).slice(0, 16));
}

function recordContourDigest(value: JsonRecord): string {
  return digest({
    work_item_id: value.work_item_id,
    scope_id: value.scope_id,
    source_revision: value.source_revision,
  }).slice(0, 16);
}
function recordPath(feature: ResearchDecisionConfig, kind: RecordKind, value: JsonRecord): string {
  const contour = recordContourDigest(value);
  if (kind === 'research')
    return path.posix.join(
      feature.paths.research_records,
      safeSegment(topicSlug(value.topic, 'research') + '--' + contour, 'research topic') + '.research.json',
    );
  if (kind === 'synthesis')
    return path.posix.join(
      feature.paths.research_records,
      safeSegment(topicSlug(value.topic, 'synthesis') + '--' + contour, 'synthesis topic') + '.synthesis.json',
    );
  return path.posix.join(
    feature.paths.decision_records,
    safeSegment(scalarText(value.decision_id) ?? 'decision', 'decision id') + '.decision.json',
  );
}

function recordId(value: JsonRecord, kind: RecordKind): string {
  if (kind === 'research') return scalarText(value.result_id) ?? '';
  if (kind === 'synthesis') return scalarText(value.bundle_id) ?? '';
  return scalarText(value.decision_id) ?? '';
}

function canonicalDirectoryRecords(
  root: string,
  feature: ResearchDecisionConfig,
  kind: RecordKind,
  context?: DecisionValidationContext,
): readonly { readonly path: string; readonly value: CanonicalRecord }[] {
  const relative = kind === 'decision' ? feature.paths.decision_records : feature.paths.research_records;
  const suffix = kind === 'research' ? '.research.json' : kind === 'synthesis' ? '.synthesis.json' : '.decision.json';
  const schema =
    kind === 'research' ? 'ResearchResult/v1' : kind === 'synthesis' ? 'ResearchSynthesis/v1' : 'DecisionRecord/v1';
  return directoryEntries(root, relative, kind + ' records')
    .filter((file) => file.endsWith(suffix))
    .sort(compareIdentifiers)
    .map((file) => {
      const recordRelative = path.posix.join(relative, file);
      const raw = readJson(root, recordRelative);
      if (raw.schema !== schema)
        fail('record schema does not match its suffix: ' + recordRelative, 'GAP-RESEARCH-DECISION-SOURCE-001');
      const value =
        kind === 'research'
          ? validateResult(raw, context)
          : kind === 'synthesis'
            ? validateSynthesis(raw, context)
            : validateDecision(raw, context);
      if (!canonicalRecordPaths(feature, kind, raw).includes(recordRelative))
        fail('record path is not canonical: ' + recordRelative, 'GAP-RESEARCH-DECISION-PATH-001');
      return { path: recordRelative, value };
    });
}

function existingRecord(root: string, relative: string): JsonRecord | null {
  if (!repositoryAccess(root).fileExists(relative, 'record path')) return null;
  return readJson(root, relative);
}

function ensureScope(existing: JsonRecord | null, current: JsonRecord, kind: RecordKind): void {
  if (!existing) return;
  if (
    existing.work_item_id !== current.work_item_id ||
    existing.source_revision !== current.source_revision ||
    existing.scope_id !== current.scope_id
  )
    fail(kind + ' record belongs to another work scope', 'GAP-RESEARCH-DECISION-SCOPE-001');
}

function assertReadScope(value: JsonRecord, options: ResearchDecisionRecordOptions): void {
  for (const [key, name] of [
    ['work_item_id', 'work scope'],
    ['source_revision', 'source revision'],
    ['scope_id', 'scope'],
  ] as const) {
    const expected = options[key];
    if (expected !== undefined && expected !== value[key])
      fail(name + ' binding is foreign or stale', 'GAP-RESEARCH-DECISION-SCOPE-001');
  }
}

function researchChangeEvent(
  input: JsonRecord,
  operation: 'init' | 'finalize',
  before: string | null,
  after: string,
  relative: string,
): DocumentationChangeEvent {
  const kind =
    input.schema === 'ResearchResult/v1'
      ? 'research'
      : input.schema === 'ResearchSynthesis/v1'
        ? 'synthesis'
        : 'decision';
  const documentId = recordId(input, kind);
  const schema =
    kind === 'research' ? 'ResearchResult/v1' : kind === 'synthesis' ? 'ResearchSynthesis/v1' : 'DecisionRecord/v1';
  const logicalEditId = schema + ':' + relative;
  const workItemId = text(input.work_item_id, 'work_item_id', 256);
  const sourceRevision = text(input.source_revision, 'source_revision', 2048);
  const actor = safeActor(input.actor);
  const pointer = safePointer(input.pointer);
  const timestamp = date(input.updated_at, 'updated_at');
  const event: DocumentationChangeEvent = {
    schema: 'DocumentationChangeEvent/v1',
    event_id:
      'documentation-event-' +
      digest({ work_item_id: workItemId, logical_edit_id: logicalEditId, operation, before, after }),
    logical_edit_id: logicalEditId,
    work_id: workItemId,
    source_revision: sourceRevision,
    operation,
    document_id: documentId,
    path_before: before ? relative : null,
    path_after: relative,
    before_sha256: before ?? '0'.repeat(64),
    after_sha256: after,
    actor,
    pointer,
    timestamp,
  };
  return event;
}

function researchChangeEventFromBytes(
  input: JsonRecord,
  operation: 'init' | 'finalize',
  beforeBytes: string | null,
  afterBytes: string,
  relative: string,
): DocumentationChangeEvent {
  return researchChangeEvent(
    input,
    operation,
    beforeBytes === null ? null : sha256(beforeBytes),
    sha256(afterBytes),
    relative,
  );
}

function validateStoredRecord(
  value: JsonRecord,
  kind: RecordKind,
  context?: DecisionValidationContext,
): CanonicalRecord {
  if (kind === 'research') return validateResult(value, context);
  if (kind === 'synthesis') return validateSynthesis(value, context);
  return validateDecision(value, context);
}

function enforceRecordCas(
  prior: JsonRecord | null,
  value: JsonRecord,
  expectedDigest: string | undefined,
  kind: RecordKind,
  context?: DecisionValidationContext,
): void {
  if (!prior) {
    if (expectedDigest !== undefined)
      fail(kind + ' create expected an existing digest', 'GAP-RESEARCH-DECISION-CAS-001');
    return;
  }
  if (kind === 'research' && prior.result_id !== value.result_id)
    fail('one living research record is allowed per topic', 'GAP-RESEARCH-DUPLICATE-TOPIC-001');
  if (kind === 'synthesis' && prior.bundle_id !== value.bundle_id)
    fail('one living synthesis record is allowed per topic', 'GAP-RESEARCH-DUPLICATE-TOPIC-001');
  validateStoredRecord(prior, kind, context);
  if (kind === 'decision' && prior.digest === value.digest) return;
  if (expectedDigest !== undefined && prior.digest !== expectedDigest)
    fail(kind + ' record CAS digest is stale', 'GAP-RESEARCH-DECISION-CAS-001');
  if (expectedDigest === undefined && prior.digest !== value.digest)
    fail(kind + ' update requires expected digest', 'GAP-RESEARCH-DECISION-CAS-001');
  if (kind === 'decision' && (prior.status === 'accepted' || prior.status === 'superseded'))
    fail('accepted decision records are immutable; create a superseding record', 'GAP-DECISION-IMMUTABLE-001');
}

function synthesisResults(
  root: string,
  feature: ResearchDecisionConfig,
  value: ResearchSynthesis,
): readonly ResearchResult[] {
  const records = canonicalDirectoryRecords(root, feature, 'research');
  return value.result_refs.map((reference) => {
    const entry = records.find((candidate) => (candidate.value as ResearchResult).result_id === reference.result_id);
    if (!entry)
      fail('research synthesis references missing result: ' + reference.result_id, 'GAP-RESEARCH-REFERENCE-001');
    const result = entry.value as ResearchResult;
    if (
      result.digest !== reference.digest ||
      result.work_item_id !== value.work_item_id ||
      result.source_revision !== value.source_revision ||
      result.scope_id !== value.scope_id
    )
      fail('research synthesis reference is stale or foreign: ' + reference.result_id, 'GAP-RESEARCH-REFERENCE-001');
    return result;
  });
}

export function validateSynthesisReferencesForResults(
  value: ResearchSynthesis,
  results: readonly ResearchResult[],
): void {
  let catalog: ReturnType<typeof qualifiedResearchSourceCatalog>;
  try {
    catalog = qualifiedResearchSourceCatalog(value.result_refs, results);
  } catch {
    fail('research synthesis predecessor catalog is invalid', 'GAP-RESEARCH-REFERENCE-001');
  }
  // Qualified aliases remain addressable across results; shared citations do not
  // create additional independent evidence. Per-result uniqueness is unchanged.
  const references = [
    ...value.findings.flatMap((finding) => finding.source_refs),
    ...value.conflicts.flatMap((conflict) => conflict.source_refs),
    ...value.options.flatMap((option) => option.evidence_refs),
    ...(value.recommendation?.evidence_refs ?? []),
  ];
  references.forEach((sourceId) => {
    try {
      resolveQualifiedResearchSource(catalog, sourceId);
    } catch {
      fail('research synthesis references an unknown or unqualified source', 'GAP-RESEARCH-REFERENCE-001');
    }
  });
}

function validateSynthesisReferences(root: string, feature: ResearchDecisionConfig, value: ResearchSynthesis): void {
  validateSynthesisReferencesForResults(value, synthesisResults(root, feature, value));
}

export function validateSynthesisExternalValidationForResults(
  value: ResearchSynthesis,
  results: readonly ResearchResult[],
): void {
  const external = value.completeness.external_validation;
  const sourceValues = qualifiedResearchSourceCatalog(value.result_refs, results).map(({ source }) => source);
  const externalSourcesByLocator = new Map<string, (typeof sourceValues)[number]>();
  for (const source of sourceValues.filter((entry) => entry.source_kind === 'external')) {
    const prior = externalSourcesByLocator.get(source.locator);
    if (prior && prior.independence_group !== source.independence_group)
      fail('shared external locator has conflicting independence metadata', 'GAP-WVP-INDEPENDENCE-001');
    externalSourcesByLocator.set(source.locator, source);
  }
  const externalSources = [...externalSourcesByLocator.values()];
  const activationTrigger = value.instruction_activation.trigger;
  const externalSignal =
    externalSources.length > 0 || ['external_fact', 'api_assumption', 'provider_change'].includes(activationTrigger);
  const countedSources = externalSignal ? externalSources : sourceValues;
  if (externalSignal && (external.required !== true || external.status === 'not_required'))
    fail('external research requires web validation', 'GAP-WVP-REQUIRED-001');
  if (!external.required) return;
  if (countedSources.length !== external.source_count)
    fail('external_validation source_count does not match counted sources', 'GAP-WVP-SOURCE-COUNT-001');
  if (external.status !== 'pass') return;
  const topic = value.topic + ' ' + activationTrigger;
  const minimum = /security|architecture|compliance/i.test(topic) ? 3 : Math.max(2, external.minimum_sources);
  if (countedSources.length < minimum)
    fail('web validation requires more independent sources', 'GAP-WVP-SOURCE-COUNT-001');
  const groups = new Set(countedSources.map((source) => source.independence_group ?? source.source_id));
  if (groups.size < minimum) fail('web validation requires independent source groups', 'GAP-WVP-INDEPENDENCE-001');
  if (external.live_check !== true && ['api_assumption', 'provider_change'].includes(activationTrigger))
    fail('live API/provider check required', 'GAP-WVP-LIVE-CHECK-001');
}

function validateSynthesisExternalValidation(
  root: string,
  feature: ResearchDecisionConfig,
  value: ResearchSynthesis,
): void {
  validateSynthesisExternalValidationForResults(value, synthesisResults(root, feature, value));
}

function validateSupersession(root: string, feature: ResearchDecisionConfig, value: DecisionRecord): void {
  if (!value.supersedes) return;
  if (value.supersedes === value.decision_id) fail('decision cannot supersede itself', 'GAP-DECISION-SUPERSESSION-001');
  const visited = new Set<string>([value.decision_id]);
  let supersededId: string | null = value.supersedes;
  for (let depth = 0; supersededId !== null; depth += 1) {
    if (depth >= 128) fail('decision supersession chain exceeds bound', 'GAP-DECISION-SUPERSESSION-001');
    if (visited.has(supersededId)) fail('decision supersession cycle detected', 'GAP-DECISION-SUPERSESSION-001');
    visited.add(supersededId);
    const relative = path.posix.join(feature.paths.decision_records, supersededId + '.decision.json');
    const prior = existingRecord(root, relative);
    if (!prior) fail('superseded decision is missing', 'GAP-DECISION-SUPERSESSION-001');
    if (!canonicalRecordPaths(feature, 'decision', prior).includes(relative))
      fail('superseded decision path is not canonical', 'GAP-DECISION-SUPERSESSION-001');
    const priorDecision = validateDecision(prior, {
      root,
      feature,
      authority_checkpoint_path: undefined,
      current_record_path: relative,
      evidence_stack: new Set([relative]),
    });
    if (priorDecision.work_item_id !== value.work_item_id || priorDecision.scope_id !== value.scope_id)
      fail('superseded decision is outside current scope', 'GAP-DECISION-SCOPE-001');
    if (priorDecision.decision_type !== value.decision_type)
      fail('superseded decision type does not match', 'GAP-DECISION-SUPERSESSION-001');
    if (!['proposed', 'accepted', 'deferred'].includes(priorDecision.status))
      fail('superseded decision has an invalid target status', 'GAP-DECISION-SUPERSESSION-001');
    supersededId = priorDecision.supersedes;
  }
}
function researchCollisionPath(feature: ResearchDecisionConfig, value: JsonRecord): string {
  const topic = scalarText(value.topic) ?? '';
  return path.posix.join(
    feature.paths.research_records,
    safeSegment(
      topicSlug(topic, 'research') + '--' + recordContourDigest(value) + '-' + digest(topic).slice(0, 16),
      'research collision topic',
    ) + '.research.json',
  );
}
function validateSynthesisIdentity(
  root: string,
  feature: ResearchDecisionConfig,
  value: JsonRecord,
  relative: string,
): void {
  for (const entry of canonicalDirectoryRecords(root, feature, 'synthesis')) {
    if (entry.path === relative) continue;
    const prior = entry.value as ResearchSynthesis;
    if (prior.bundle_id === value.bundle_id)
      fail('research synthesis bundle_id already belongs to another canonical contour', 'GAP-RESEARCH-IDENTITY-001');
  }
}
function validateResearchIdentity(
  root: string,
  feature: ResearchDecisionConfig,
  value: JsonRecord,
  relative: string,
): void {
  for (const entry of canonicalDirectoryRecords(root, feature, 'research')) {
    if (entry.path === relative) continue;
    const prior = entry.value as ResearchResult;
    if (prior.result_id === value.result_id)
      fail('research result_id already belongs to another topic', 'GAP-RESEARCH-IDENTITY-001');
    if (
      prior.work_item_id === value.work_item_id &&
      prior.scope_id === value.scope_id &&
      prior.source_revision === value.source_revision &&
      prior.topic === value.topic
    )
      fail(
        'one living research record is allowed per work/scope/source topic contour',
        'GAP-RESEARCH-DUPLICATE-TOPIC-001',
      );
  }
}
function restoreAtomic(root: string, relative: string, content: string | null): void {
  if (content === null) {
    repositoryAccess(root).removeFile(relative, 'record path');
    return;
  }
  writeAtomic(root, relative, content);
}
function restoreResearchFiles(root: string, files: readonly (readonly [string, string | null])[]): void {
  files.forEach(([relative, content]) => restoreAtomic(root, relative, content));
}
export function validateResearchResult(value: unknown): ResearchResult {
  return validateResult(asRecord(value, 'ResearchResult'));
}

export function validateResearchSynthesis(value: unknown): ResearchSynthesis {
  return validateSynthesis(asRecord(value, 'ResearchSynthesis'));
}

export function validateDecisionRecord(value: unknown, options: ResearchDecisionRecordOptions = {}): DecisionRecord {
  const record = asRecord(value, 'DecisionRecord');
  if (options.root === undefined) return validateDecision(record);
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  const currentRecordPath = recordPath(feature, 'decision', record);
  const context: DecisionValidationContext = {
    root,
    feature,
    authority_checkpoint_path: options.authority_checkpoint_path,
    current_record_path: currentRecordPath,
    evidence_stack: new Set([currentRecordPath]),
  };
  return validateDecision(record, context);
}
/** The host reads these fields from its persisted report, work state and maintenance generation. */
export interface ObservedResearchBinding {
  readonly work_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly action_id: string;
  readonly issue_id: string;
  readonly scope_id: string;
  readonly scope_digest: string;
  readonly source_revision: string;
  readonly source_scope_digest: string;
  readonly config_digest: string;
  readonly maintenance_generation: number;
  readonly lease_ticket_id: string;
  readonly lease_thread_id: string;
  readonly lease_generation: number;
}

export interface ObservedResearchRecordPlan {
  readonly schema: 'ObservedResearchRecordPlan/v1' | 'ObservedSynthesisRecordPlan/v1';
  readonly binding: ObservedResearchBinding;
  readonly observation_digest: string;
  readonly result_digest: string;
  readonly record_path: string;
  readonly record_pre_sha256: string | null;
  readonly record_sha256: string;
  readonly changelog_path: string;
  readonly changelog_pre_sha256: string | null;
  readonly changelog_sha256: string;
  readonly before_digest: string | null;
  readonly digest: string;
}

export interface ObservedResearchRecordInput {
  readonly root: string;
  readonly result: ResearchResult | ResearchSynthesis;
  readonly observation: SessionBridgeObservation;
  readonly binding: ObservedResearchBinding;
  readonly host_state: HostStateStore;
  readonly readCurrent: () => ObservedResearchBinding;
}

export interface ObservedActivationUseWritePlan {
  readonly schema: 'ObservedActivationUseWritePlan/v1';
  readonly binding: ObservedResearchBinding;
  readonly use_digest: string;
  readonly history_path: string;
  readonly history_pre_sha256: string | null;
  readonly history_sha256: string;
  readonly digest: string;
}

export interface ObservedActivationUseWriteInput {
  readonly root: string;
  readonly use: ActivationUse;
  readonly binding: ObservedResearchBinding;
  readonly host_state: HostStateStore;
  readonly readCurrent: () => ObservedResearchBinding;
}

const OBSERVED_PLAN_KEYS = new Set([
  'schema',
  'binding',
  'observation_digest',
  'result_digest',
  'record_path',
  'record_pre_sha256',
  'record_sha256',
  'changelog_path',
  'changelog_pre_sha256',
  'changelog_sha256',
  'before_digest',
  'digest',
]);
const OBSERVED_BINDING_KEYS = new Set([
  'work_id',
  'attempt',
  'run_id',
  'action_id',
  'issue_id',
  'scope_id',
  'scope_digest',
  'source_revision',
  'source_scope_digest',
  'config_digest',
  'maintenance_generation',
  'lease_ticket_id',
  'lease_thread_id',
  'lease_generation',
]);
const ACTIVATION_WRITE_PLAN_KEYS = new Set([
  'schema',
  'binding',
  'use_digest',
  'history_path',
  'history_pre_sha256',
  'history_sha256',
  'digest',
]);

function validateObservedBinding(value: unknown): ObservedResearchBinding {
  const binding = asRecord(value, 'observed binding');
  if (
    Object.keys(binding).length !== OBSERVED_BINDING_KEYS.size ||
    Object.keys(binding).some((key) => !OBSERVED_BINDING_KEYS.has(key))
  )
    fail('observed binding shape is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  id(binding.work_id, 'observed work_id');
  id(binding.run_id, 'observed run_id', USE_ID);
  id(binding.scope_id, 'observed scope_id', USE_ID);
  id(binding.lease_ticket_id, 'observed lease ticket_id', USE_ID);
  text(binding.lease_thread_id, 'observed lease thread_id', 256);
  text(binding.source_revision, 'observed source_revision', 2048);
  if (
    !Number.isSafeInteger(binding.attempt) ||
    Number(binding.attempt) < 1 ||
    !Number.isSafeInteger(binding.maintenance_generation) ||
    Number(binding.maintenance_generation) < 0 ||
    !Number.isSafeInteger(binding.lease_generation) ||
    Number(binding.lease_generation) < 1 ||
    typeof binding.issue_id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(binding.issue_id)
  )
    fail('observed binding is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  for (const key of ['action_id', 'scope_digest', 'source_scope_digest', 'config_digest'])
    hash(binding[key], 'observed ' + key);
  return binding as unknown as ObservedResearchBinding;
}

/** Shape and digest check only; the persisted ledger and host must still prove authority. */
export function validateObservedResearchRecordPlan(value: unknown): ObservedResearchRecordPlan {
  const plan = asRecord(value, 'observed research plan');
  validateObservedBinding(plan.binding);
  if (
    Object.keys(plan).length !== OBSERVED_PLAN_KEYS.size ||
    Object.keys(plan).some((key) => !OBSERVED_PLAN_KEYS.has(key)) ||
    !['ObservedResearchRecordPlan/v1', 'ObservedSynthesisRecordPlan/v1'].includes(String(plan.schema))
  )
    fail('observed research plan shape is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  for (const key of ['observation_digest', 'result_digest', 'record_sha256', 'changelog_sha256', 'digest'])
    hash(plan[key], 'observed ' + key);
  for (const key of ['record_pre_sha256', 'changelog_pre_sha256', 'before_digest'])
    if (plan[key] !== null) hash(plan[key], 'observed ' + key);
  if ((plan.record_pre_sha256 === null) !== (plan.before_digest === null))
    fail('observed research before digest is inconsistent', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  const recordPath = safePointer(plan.record_path, 'observed research record path');
  const changelogPath = safePointer(plan.changelog_path, 'observed research changelog path');
  const suffix = plan.schema === 'ObservedSynthesisRecordPlan/v1' ? '.synthesis.json' : '.research.json';
  if (recordPath === changelogPath || !recordPath.endsWith(suffix) || !changelogPath.endsWith('.jsonl'))
    fail('observed research paths are invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  const { digest: supplied, ...body } = plan;
  if (supplied !== canonicalJsonDigest(body))
    fail('observed research plan digest is invalid', 'GAP-RESEARCH-DECISION-DIGEST-001');
  return plan as unknown as ObservedResearchRecordPlan;
}

export function validateObservedActivationUseWritePlan(value: unknown): ObservedActivationUseWritePlan {
  const plan = asRecord(value, 'observed activation use write plan');
  if (
    Object.keys(plan).length !== ACTIVATION_WRITE_PLAN_KEYS.size ||
    Object.keys(plan).some((key) => !ACTIVATION_WRITE_PLAN_KEYS.has(key)) ||
    plan.schema !== 'ObservedActivationUseWritePlan/v1'
  )
    fail('observed activation write plan shape is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  validateObservedBinding(plan.binding);
  for (const key of ['use_digest', 'history_sha256', 'digest']) hash(plan[key], 'observed ' + key);
  if (plan.history_pre_sha256 !== null) hash(plan.history_pre_sha256, 'observed history preimage');
  if (
    !safePointer(plan.history_path, 'observed activation history path').endsWith('instruction-activation-history.jsonl')
  )
    fail('observed activation history path is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  const { digest: supplied, ...body } = plan;
  if (supplied !== canonicalJsonDigest(body))
    fail('observed activation write plan digest is invalid', 'GAP-RESEARCH-DECISION-DIGEST-001');
  return plan as unknown as ObservedActivationUseWritePlan;
}

function activationWriteContext(input: ObservedActivationUseWriteInput): {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly use: ActivationUse;
  readonly relative: string;
  readonly access: SafeRepositoryAccess;
} {
  const root = requiredResearchRoot({ root: input.root });
  const binding = validateObservedBinding(input.binding);
  const gate = requireResearchWriteGate(
    { root, host_state: input.host_state, expected_maintenance_generation: binding.maintenance_generation },
    root,
  );
  gate.store.withWorkingMutation(
    root,
    gate.generation,
    () => undefined,
    () => undefined,
  );
  const snapshot = researchConfigSnapshot(root);
  if (
    snapshot.digest !== binding.config_digest ||
    canonicalJsonDigest(input.readCurrent()) !== canonicalJsonDigest(binding)
  )
    fail('observed activation reservation is foreign or stale', 'GAP-INSTRUCTION-USE-CAS-001');
  const use = validateActivationUse(input.use);
  if (
    use.work_item_id !== binding.work_id ||
    use.scope_id !== binding.scope_id ||
    use.source_revision !== binding.source_revision
  )
    fail('observed activation use scope is foreign', 'GAP-INSTRUCTION-USE-BINDING-001');
  validateActivationUseRegistry(use, snapshot.feature.registry);
  const resolution = resolveInstructionActivation(
    {
      intent: use.trigger,
      risk: use.risk,
      lane: use.lane,
      phase: use.phase,
      lifecycle_phase: use.phase,
      contour: use.scope_id,
      scope_id: use.scope_id,
      work_item_id: use.work_item_id,
      source_revision: use.source_revision,
      artifact_kind: use.phase === 'plan' && use.lane === 'synthesizer' ? 'synthesis' : 'research',
      triggers: [use.trigger],
      required_instruction_ids: use.required_instruction_ids,
    },
    { root, write_cache: false },
  );
  if (
    resolution.gaps.some((gap) => gap.blocking) ||
    !(
      use.cache_status === resolution.cache_status ||
      (use.cache_status === 'refreshed' && resolution.cache_status === 'hit')
    )
  )
    fail('observed activation use differs from current instruction resolution', 'GAP-INSTRUCTION-USE-REGISTRY-001');
  return {
    root,
    feature: snapshot.feature,
    use,
    relative: activationHistoryRelative(snapshot.feature, use.work_item_id),
    access: repositoryAccess(root),
  };
}

/** Read-only plan for the issued instruction set; the host must CAS-persist it before dispatch. */
export async function prepareInstructionActivationUseWrite(
  input: ObservedActivationUseWriteInput,
): Promise<ObservedActivationUseWritePlan> {
  const context = activationWriteContext(input);
  const { access, relative, use } = context;
  const previous = access.fileExists(relative, 'activation history')
    ? access.readText(relative, 'activation history')
    : null;
  if (
    readActivationHistory(context.root, context.feature, use.work_item_id).some(
      (candidate) => candidate.use_id === use.use_id,
    )
  )
    fail('activation use already exists; prior durable reservation required', 'GAP-INSTRUCTION-USE-REPLAY-001');
  const next = (previous ?? '') + canonicalJson(use) + '\n';
  if (Buffer.byteLength(next, 'utf8') > MAX_JSON_BYTES)
    fail('activation history exceeds bound', 'GAP-INSTRUCTION-USE-BOUND-001');
  const body = {
    schema: 'ObservedActivationUseWritePlan/v1' as const,
    binding: input.binding,
    use_digest: use.digest,
    history_path: relative,
    history_pre_sha256: previous === null ? null : rawSha256(previous),
    history_sha256: rawSha256(next),
  };
  return validateObservedActivationUseWritePlan(freezeJsonValue({ ...body, digest: canonicalJsonDigest(body) }));
}

/** Persist an already-CAS-reserved use, or replay its exact completed history bytes. */
export async function applyInstructionActivationUseWriteAsync(
  input: ObservedActivationUseWriteInput & {
    readonly plan: ObservedActivationUseWritePlan;
  },
): Promise<{ readonly path: string; readonly sha256: string; readonly replay: boolean }> {
  const plan = validateObservedActivationUseWritePlan(input.plan);
  const root = requiredResearchRoot({ root: input.root });
  const access = repositoryAccess(root);
  ensureDirectory(root, path.posix.dirname(plan.history_path));
  return access.withExclusiveLockAsync(plan.history_path + '.lock', 'activation history lock', async () => {
    const context = activationWriteContext(input);
    if (
      context.relative !== plan.history_path ||
      plan.use_digest !== context.use.digest ||
      canonicalJsonDigest(plan.binding) !== canonicalJsonDigest(input.binding)
    )
      fail('activation write plan is foreign or stale', 'GAP-INSTRUCTION-USE-CAS-001');
    const before = access.fileExists(plan.history_path, 'activation history')
      ? access.readText(plan.history_path, 'activation history')
      : null;
    const currentHash = before === null ? null : rawSha256(before);
    const replay = currentHash === plan.history_sha256;
    if (!replay) {
      if (currentHash !== plan.history_pre_sha256)
        fail('activation history changed after reservation', 'GAP-INSTRUCTION-USE-CAS-001');
      const next = (before ?? '') + canonicalJson(context.use) + '\n';
      if (rawSha256(next) !== plan.history_sha256 || Buffer.byteLength(next, 'utf8') > MAX_JSON_BYTES)
        fail('activation write plan does not match current history', 'GAP-INSTRUCTION-USE-CAS-001');
      if (before === null) await access.writeExclusiveAsync(plan.history_path, next, 'activation history');
      else await access.replaceAtomicAsync(plan.history_path, plan.history_pre_sha256!, next, 'activation history');
    }
    activationWriteContext(input);
    if (rawSha256(access.readText(plan.history_path, 'activation history')) !== plan.history_sha256)
      fail('activation history changed after persistence', 'GAP-INSTRUCTION-USE-CAS-001');
    return { path: plan.history_path, sha256: plan.history_sha256, replay };
  });
}

function observedResearchContext(input: ObservedResearchRecordInput): {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly value: JsonRecord;
  readonly kind: 'research' | 'synthesis';
  readonly relative: string;
  readonly access: SafeRepositoryAccess;
} {
  const root = requiredResearchRoot({ root: input.root });
  const gate = requireResearchWriteGate(
    { root, host_state: input.host_state, expected_maintenance_generation: input.binding.maintenance_generation },
    root,
  );
  gate.store.withWorkingMutation(
    root,
    gate.generation,
    () => undefined,
    () => undefined,
  );
  const config = researchConfigSnapshot(root);
  const binding = input.binding;
  const observation = parseSessionBridgeObservation(input.observation);
  if (
    !Number.isSafeInteger(binding.attempt) ||
    binding.attempt < 1 ||
    ![binding.action_id, binding.scope_digest, binding.source_scope_digest, binding.config_digest].every((value) =>
      DIGEST.test(value),
    ) ||
    !Number.isSafeInteger(binding.maintenance_generation) ||
    binding.maintenance_generation < 0 ||
    binding.config_digest !== config.digest ||
    canonicalJsonDigest(input.readCurrent()) !== canonicalJsonDigest(binding) ||
    observation.action_id !== binding.action_id ||
    observation.issue_id !== binding.issue_id ||
    observation.status !== 'reported_complete' ||
    observation.output_digest !== canonicalJsonDigest(observation.summary)
  )
    fail('observed research reservation is foreign or stale', 'GAP-RESEARCH-DECISION-CAS-001');
  const value = asRecord(input.result, 'observed research record');
  const kind =
    value.schema === 'ResearchResult/v1' ? 'research' : value.schema === 'ResearchSynthesis/v1' ? 'synthesis' : null;
  if (!kind) fail('observed research record schema is invalid', 'GAP-RESEARCH-DECISION-SCHEMA-001');
  if (
    value.work_item_id !== binding.work_id ||
    value.scope_id !== binding.scope_id ||
    value.source_revision !== binding.source_revision
  )
    fail('observed research result scope is foreign', 'GAP-RESEARCH-DECISION-SCOPE-001');
  const feature = config.feature;
  let relative = recordPath(feature, kind, value);
  const occupying = existingRecord(root, relative);
  if (kind === 'research' && occupying && occupying.topic !== value.topic)
    relative = researchCollisionPath(feature, value);
  const validation = {
    root,
    feature,
    authority_checkpoint_path: undefined,
    current_record_path: relative,
    activation_history_direct_read: true,
  };
  const validated = validateStoredRecord(value, kind, validation);
  if (kind === 'synthesis') {
    validateSynthesisReferences(root, feature, validated as ResearchSynthesis);
    validateSynthesisExternalValidation(root, feature, validated as ResearchSynthesis);
  }
  if (kind === 'research') validateResearchIdentity(root, feature, value, relative);
  else validateSynthesisIdentity(root, feature, value, relative);
  return { root, feature, kind, value, relative, access: repositoryAccess(root) };
}

function observedResearchBytes(
  input: ObservedResearchRecordInput,
  context: ReturnType<typeof observedResearchContext>,
) {
  const { root, feature, kind, value, relative, access } = context;
  const prior = existingRecord(root, relative);
  ensureScope(prior, value, kind);
  if (prior?.digest === value.digest)
    fail('identical research record requires its prior durable reservation', 'GAP-RESEARCH-DECISION-CAS-001');
  enforceRecordCas(prior, value, prior?.digest as string | undefined, kind, {
    root,
    feature,
    authority_checkpoint_path: undefined,
    current_record_path: relative,
    activation_history_direct_read: true,
  });
  const recordBefore = access.fileExists(relative, 'research record')
    ? access.readText(relative, 'research record')
    : null;
  const changelogPath = feature.paths.changelog;
  const changelogBefore = access.fileExists(changelogPath, 'research changelog')
    ? access.readText(changelogPath, 'research changelog')
    : null;
  const recordAfter = JSON.stringify(JSON.parse(canonicalJson(value)), null, 2) + '\n';
  const event = researchChangeEventFromBytes(value, prior ? 'finalize' : 'init', recordBefore, recordAfter, relative);
  const changelogAfter = (changelogBefore ?? '') + canonicalJson(event) + '\n';
  const eventCount = changelogBefore ? changelogBefore.split(/\r?\n/).filter(Boolean).length : 0;
  if (
    eventCount >= MAX_CHANGELOG_EVENTS ||
    Buffer.byteLength(recordAfter, 'utf8') > MAX_JSON_BYTES ||
    Buffer.byteLength(changelogAfter, 'utf8') > MAX_JSON_BYTES
  )
    fail('research record or changelog exceeds bound', 'GAP-RESEARCH-DECISION-CHANGELOG-BOUND-001');
  return { recordBefore, changelogBefore, recordAfter, changelogAfter, event };
}

/** Read-only preparation. The host must CAS-persist the returned full plan before applying it. */
export async function prepareObservedResearchRecord(
  input: ObservedResearchRecordInput,
): Promise<ObservedResearchRecordPlan> {
  const context = observedResearchContext(input);
  const bytes = observedResearchBytes(input, context);
  const body = {
    schema:
      context.kind === 'synthesis'
        ? ('ObservedSynthesisRecordPlan/v1' as const)
        : ('ObservedResearchRecordPlan/v1' as const),
    binding: input.binding,
    observation_digest: canonicalJsonDigest(input.observation),
    result_digest: input.result.digest,
    record_path: context.relative,
    record_pre_sha256: bytes.recordBefore === null ? null : rawSha256(bytes.recordBefore),
    record_sha256: rawSha256(bytes.recordAfter),
    changelog_path: context.feature.paths.changelog,
    changelog_pre_sha256: bytes.changelogBefore === null ? null : rawSha256(bytes.changelogBefore),
    changelog_sha256: rawSha256(bytes.changelogAfter),
    before_digest:
      bytes.recordBefore === null ? null : (existingRecord(context.root, context.relative)!.digest as string),
  };
  return validateObservedResearchRecordPlan(freezeJsonValue({ ...body, digest: canonicalJsonDigest(body) }));
}

function observedResearchChangelogExtension(
  bytes: string | null,
  plan: ObservedResearchRecordPlan,
  value: JsonRecord,
): { eventLine: string; present: boolean } {
  const current = bytes ?? '';
  if (Buffer.byteLength(current, 'utf8') > MAX_JSON_BYTES || (current !== '' && !current.endsWith('\n')))
    fail('research changelog framing or bound changed', 'GAP-RESEARCH-DECISION-CAS-001');
  const event = researchChangeEvent(
    value,
    plan.record_pre_sha256 === null ? 'init' : 'finalize',
    plan.record_pre_sha256,
    plan.record_sha256,
    plan.record_path,
  );
  const eventLine = canonicalJson(event) + '\n';
  const lines = current.split('\n');
  if (lines.length - 1 > MAX_CHANGELOG_EVENTS)
    fail('research changelog exceeds bound', 'GAP-RESEARCH-DECISION-CHANGELOG-BOUND-001');
  let offset = 0;
  let present = false;
  let eventOffset = -1;
  const prefixHash = createHash('sha256');
  let anchor = -1;
  const matchPrefix = () => {
    const beforeMatches =
      plan.changelog_pre_sha256 === null ? offset === 0 : prefixHash.copy().digest('hex') === plan.changelog_pre_sha256;
    if (beforeMatches && prefixHash.copy().update(eventLine).digest('hex') === plan.changelog_sha256) anchor = offset;
  };
  matchPrefix();
  for (const line of lines.slice(0, -1)) {
    if (line !== '') {
      let entry: unknown;
      try {
        entry = JSON.parse(line);
      } catch {
        fail('research changelog event is invalid', 'GAP-RESEARCH-DECISION-CAS-001');
      }
      if (!validObservedResearchChangeEvent(entry))
        fail('research changelog event is invalid', 'GAP-RESEARCH-DECISION-CAS-001');
      const item = entry as Record<string, unknown>;
      if (item.event_id === event.event_id) {
        if (present || canonicalJson(item) !== canonicalJson(event))
          fail('research changelog reserved event differs or is duplicated', 'GAP-RESEARCH-DECISION-CAS-001');
        present = true;
        eventOffset = offset;
      }
    }
    offset += line.length + 1;
    prefixHash.update(line + '\n');
    matchPrefix();
  }
  // Authenticate the immutable reservation's original prefix and event, while preserving unrelated suffix events.
  if (anchor < 0 || (present && eventOffset < anchor))
    fail('research changelog does not extend its reserved preimage', 'GAP-RESEARCH-DECISION-CAS-001');
  return { eventLine, present };
}
/** Read a committed activation prefix without granting write or execution rights. */
export function readHistoricalObservedActivationUse(input: {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly plan: ObservedActivationUseWritePlan;
  readonly use: ActivationUse;
}): ActivationUse {
  const activation = validateObservedActivationUseWritePlan(input.plan),
    use = validateActivationUse(input.use),
    root = requiredResearchRoot({ root: input.root }),
    access = repositoryAccess(root);
  if (
    activation.use_digest !== use.digest ||
    activation.history_path !== activationHistoryRelative(input.feature, activation.binding.work_id) ||
    use.work_item_id !== activation.binding.work_id ||
    use.scope_id !== activation.binding.scope_id ||
    use.source_revision !== activation.binding.source_revision
  )
    fail('historical activation binding differs', 'GAP-RESEARCH-DECISION-CAS-001');
  const historyBytes = access.readText(activation.history_path, 'historical activation history');
  const history = readActivationHistory(root, input.feature, activation.binding.work_id),
    lines = historyBytes.split('\n');
  if (lines.at(-1) !== '' || lines.length - 1 !== history.length)
    fail('historical activation history framing differs', 'GAP-RESEARCH-DECISION-CAS-001');
  let offset = 0,
    matched = 0;
  for (let index = 0; index < history.length; index += 1) {
    const prefix = historyBytes.slice(0, offset);
    offset += lines[index]!.length + 1;
    if (history[index]!.use_id !== use.use_id) continue;
    if (
      history[index]!.digest !== use.digest ||
      (activation.history_pre_sha256 === null ? prefix !== '' : rawSha256(prefix) !== activation.history_pre_sha256) ||
      rawSha256(historyBytes.slice(0, offset)) !== activation.history_sha256
    )
      fail('historical activation prefix differs', 'GAP-RESEARCH-DECISION-CAS-001');
    matched += 1;
  }
  if (
    matched !== 1 ||
    rawSha256(access.readText(activation.history_path, 'historical activation stability')) !== rawSha256(historyBytes)
  )
    fail('historical activation is missing or changed', 'GAP-RESEARCH-DECISION-CAS-001');
  return use;
}

/** Read an already admitted historical record; this proves lineage, never write authority or acceptance. */
export function readHistoricalObservedResearchLineage(input: {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly plan: ObservedResearchRecordPlan;
  readonly activation_plan: ObservedActivationUseWritePlan;
  readonly activation_use: ActivationUse;
}): ResearchResult | ResearchSynthesis {
  const plan = validateObservedResearchRecordPlan(input.plan),
    activation = validateObservedActivationUseWritePlan(input.activation_plan),
    root = requiredResearchRoot({ root: input.root }),
    access = repositoryAccess(root);
  if (
    canonicalJsonDigest(plan.binding) !== canonicalJsonDigest(activation.binding) ||
    plan.changelog_path !== input.feature.paths.changelog
  )
    fail('historical research activation binding differs', 'GAP-RESEARCH-DECISION-CAS-001');
  const historyBytes = access.readText(activation.history_path, 'historical activation history'),
    use = readHistoricalObservedActivationUse({
      root,
      feature: input.feature,
      plan: activation,
      use: input.activation_use,
    }),
    recordBytes = access.readText(plan.record_path, 'historical admitted research'),
    changelogBytes = access.readText(plan.changelog_path, 'historical research lineage');
  if (rawSha256(recordBytes) !== plan.record_sha256)
    fail('historical admitted record differs', 'GAP-RESEARCH-DECISION-CAS-001');
  const value = asRecord(JSON.parse(recordBytes), 'historical research record');
  if (!observedResearchChangelogExtension(changelogBytes, plan, value).present)
    fail('historical research reserved lineage is missing', 'GAP-RESEARCH-DECISION-CAS-001');
  const options = {
    root,
    feature: input.feature,
    authority_checkpoint_path: undefined,
    current_record_path: plan.record_path,
    activation_history_direct_read: true,
  };
  const result =
    plan.schema === 'ObservedSynthesisRecordPlan/v1'
      ? validateSynthesis(value, options)
      : validateResult(value, options);
  if (
    result.digest !== plan.result_digest ||
    (value.instruction_activation as RecordInstructionActivation).use_id !== use.use_id ||
    rawSha256(access.readText(plan.record_path, 'historical record stability')) !== plan.record_sha256 ||
    rawSha256(access.readText(activation.history_path, 'historical activation stability')) !==
      rawSha256(historyBytes) ||
    rawSha256(access.readText(plan.changelog_path, 'historical lineage stability')) !== rawSha256(changelogBytes)
  )
    fail('historical research record or lineage changed', 'GAP-RESEARCH-DECISION-CAS-001');
  return result;
}

/** Apply a committed plan against its exact target and append-only changelog extension. */
export async function recordObservedResearchResultAsync(
  input: ObservedResearchRecordInput & {
    readonly plan: ObservedResearchRecordPlan;
  },
): Promise<{
  readonly recordPath: string;
  readonly recordSha256: string;
  readonly changelogPath: string;
  readonly changelogSha256: string;
  readonly replay: boolean;
}> {
  const root = requiredResearchRoot({ root: input.root });
  const feature = settings(root);
  const relative = input.plan.record_path;
  const access = repositoryAccess(root);
  const plan = validateObservedResearchRecordPlan(input.plan);
  if (
    canonicalJsonDigest(plan.binding) !== canonicalJsonDigest(input.binding) ||
    plan.observation_digest !== canonicalJsonDigest(input.observation) ||
    plan.result_digest !== input.result.digest ||
    plan.changelog_path !== feature.paths.changelog
  )
    fail('observed research plan is foreign or stale', 'GAP-RESEARCH-DECISION-CAS-001');
  ensureDirectory(root, path.posix.dirname(feature.paths.changelog));
  ensureDirectory(root, path.posix.dirname(relative));
  return access.withExclusiveLockAsync(feature.paths.changelog + '.lock', 'research record lock', async () => {
    const history = activationHistoryRelative(feature, input.binding.work_id);
    return access.withExclusiveLockAsync(history + '.lock', 'research activation history lock', async () => {
      const context = observedResearchContext(input);
      if (context.relative !== relative) fail('research record path changed', 'GAP-RESEARCH-DECISION-CAS-001');
      const recordBefore = access.fileExists(relative, 'research record')
        ? access.readText(relative, 'research record')
        : null;
      const changelogBefore = access.fileExists(feature.paths.changelog, 'research changelog')
        ? access.readText(feature.paths.changelog, 'research changelog')
        : null;
      const recordHash = recordBefore === null ? null : rawSha256(recordBefore);
      const changelogHash = changelogBefore === null ? null : rawSha256(changelogBefore);
      const extension = observedResearchChangelogExtension(changelogBefore, plan, context.value);
      const replay = recordHash === plan.record_sha256 && extension.present;
      if (!replay) {
        if (recordHash !== plan.record_pre_sha256 && recordHash !== plan.record_sha256)
          fail('research target changed after reservation', 'GAP-RESEARCH-DECISION-CAS-001');
        if (extension.present)
          fail('research changelog event exists without its reserved target', 'GAP-RESEARCH-DECISION-CAS-001');
        const recordAfter = JSON.stringify(JSON.parse(canonicalJson(context.value)), null, 2) + '\n';
        if (rawSha256(recordAfter) !== plan.record_sha256 || Buffer.byteLength(recordAfter, 'utf8') > MAX_JSON_BYTES)
          fail('research record plan differs from observed result', 'GAP-RESEARCH-DECISION-CAS-001');
        const next = (changelogBefore ?? '') + extension.eventLine;
        if (Buffer.byteLength(next, 'utf8') > MAX_JSON_BYTES || next.split('\n').length - 1 > MAX_CHANGELOG_EVENTS)
          fail('research changelog exceeds bound', 'GAP-RESEARCH-DECISION-CHANGELOG-BOUND-001');
        if (recordHash !== plan.record_sha256) {
          if (recordBefore === null) await access.writeExclusiveAsync(relative, recordAfter, 'research record');
          else await access.replaceAtomicAsync(relative, plan.record_pre_sha256!, recordAfter, 'research record');
        }
        if (changelogBefore === null)
          await access.writeExclusiveAsync(feature.paths.changelog, next, 'research changelog');
        else await access.replaceAtomicAsync(feature.paths.changelog, changelogHash!, next, 'research changelog');
      }
      observedResearchContext(input);
      const persistedLog = access.readText(feature.paths.changelog, 'research changelog');
      if (
        rawSha256(access.readText(relative, 'research record')) !== plan.record_sha256 ||
        !observedResearchChangelogExtension(persistedLog, plan, context.value).present
      )
        fail('research record pair changed after persistence', 'GAP-RESEARCH-DECISION-CAS-001');
      return {
        recordPath: relative,
        recordSha256: plan.record_sha256,
        changelogPath: feature.paths.changelog,
        changelogSha256: rawSha256(persistedLog),
        replay,
      };
    });
  });
}

/** Resume one reserved historical record under its changelog/history locks and exact Host CAS. */
export async function resumeHistoricalObservedResearchResult(input: {
  readonly root: string;
  readonly feature: ResearchDecisionConfig;
  readonly result: ResearchResult;
  readonly observation: SessionBridgeObservation;
  readonly binding: ObservedResearchBinding;
  readonly activation_use: ActivationUse;
  readonly activation_plan: ObservedActivationUseWritePlan;
  readonly plan: ObservedResearchRecordPlan;
  readonly host_state: HostStateStore;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
}): Promise<{
  readonly recordPath: string;
  readonly recordSha256: string;
  readonly changelogPath: string;
  readonly changelogSha256: string;
  readonly replay: boolean;
}> {
  const root = requiredResearchRoot({ root: input.root });
  const plan = validateObservedResearchRecordPlan(input.plan);
  if (!HostStateStore.isHostStateStore(input.host_state))
    fail('trusted HostStateStore required for historical publication', 'GAP-RESEARCH-DECISION-HOST-001');
  try {
    input.host_state.assertWorkingRepositoryRoot(root);
  } catch {
    fail('historical publication HostStateStore is bound to another repository', 'GAP-RESEARCH-DECISION-HOST-001');
  }
  const activation = validateObservedActivationUseWritePlan(input.activation_plan);
  const use = validateActivationUse(input.activation_use);
  const observation = parseSessionBridgeObservation(input.observation);
  const binding = validateObservedBinding(input.binding);
  const value = asRecord(input.result, 'historical observed research result');
  if (
    plan.schema !== 'ObservedResearchRecordPlan/v1' ||
    value.schema !== 'ResearchResult/v1' ||
    canonicalJsonDigest(plan.binding) !== canonicalJsonDigest(binding) ||
    canonicalJsonDigest(activation.binding) !== canonicalJsonDigest(binding) ||
    plan.observation_digest !== canonicalJsonDigest(observation) ||
    plan.result_digest !== input.result.digest ||
    activation.use_digest !== use.digest ||
    plan.changelog_path !== input.feature.paths.changelog ||
    observation.action_id !== binding.action_id ||
    observation.issue_id !== binding.issue_id ||
    observation.status !== 'reported_complete' ||
    observation.output_digest !== canonicalJsonDigest(observation.summary) ||
    value.work_item_id !== binding.work_id ||
    value.scope_id !== binding.scope_id ||
    value.source_revision !== binding.source_revision ||
    use.work_item_id !== binding.work_id ||
    use.scope_id !== binding.scope_id ||
    use.source_revision !== binding.source_revision
  )
    fail('historical research reservation or original binding differs', 'GAP-RESEARCH-DECISION-CAS-001');
  if (plan.record_pre_sha256 !== null && plan.changelog_pre_sha256 === null)
    fail(
      'historical research existing-record publication without a changelog beforeimage is unsupported',
      'GAP-RESEARCH-DECISION-CAS-001',
    );
  const feature = input.feature;
  const access = repositoryAccess(root);
  const relative = plan.record_path;
  const validateOriginal = (): ResearchResult => {
    let target = recordPath(feature, 'research', value);
    const occupying = existingRecord(root, target);
    if (occupying && occupying.topic !== value.topic) target = researchCollisionPath(feature, value);
    if (target !== relative) fail('historical research target path differs', 'GAP-RESEARCH-DECISION-CAS-001');
    const validation = {
      root,
      feature,
      authority_checkpoint_path: undefined,
      current_record_path: relative,
      activation_history_direct_read: true,
    };
    const validated = validateStoredRecord(value, 'research', validation) as ResearchResult;
    validateResearchIdentity(root, feature, value, relative);
    if ((value.instruction_activation as RecordInstructionActivation).use_id !== use.use_id)
      fail('historical research activation use differs', 'GAP-RESEARCH-DECISION-CAS-001');
    readHistoricalObservedActivationUse({ root, feature, plan: activation, use });
    return validated;
  };
  validateOriginal();
  ensureDirectory(root, path.posix.dirname(feature.paths.changelog));
  ensureDirectory(root, path.posix.dirname(relative));
  const history = activationHistoryRelative(feature, binding.work_id);
  const decodeUtf8Exact = (bytes: Buffer, label: string): string => {
    const decoded = bytes.toString('utf8');
    if (!Buffer.from(decoded, 'utf8').equals(bytes))
      fail(`historical research ${label} is not exact UTF-8`, 'GAP-RESEARCH-DECISION-CAS-001');
    return decoded;
  };
  const restoreExact = async (file: string, before: string | null, candidate: string, label: string): Promise<void> => {
    const current = access.fileExists(file, label) ? access.readBytes(file, label) : null;
    const currentHash = current === null ? null : rawSha256(current);
    const beforeBytes = before === null ? null : Buffer.from(before, 'utf8');
    const beforeHash = beforeBytes === null ? null : rawSha256(beforeBytes);
    const candidateHash = rawSha256(Buffer.from(candidate, 'utf8'));
    if (currentHash === beforeHash) return;
    if (currentHash !== candidateHash)
      fail('historical research rollback found unexpected bytes', 'GAP-RESEARCH-DECISION-CAS-001');
    // A new exact candidate remains resumable custody; the portable access API has no safe delete on Windows.
    if (before !== null) await access.replaceAtomicAsync(file, candidateHash, before, label);
  };
  let result:
    | {
        recordPath: string;
        recordSha256: string;
        changelogPath: string;
        changelogSha256: string;
        replay: boolean;
      }
    | undefined;
  let undo = async (): Promise<void> => undefined;
  const publish = async (): Promise<void> => {
    const validated = validateOriginal();
    const recordBeforeBytes = access.fileExists(relative, 'research record')
      ? access.readBytes(relative, 'research record')
      : null;
    const changelogBeforeBytes = access.fileExists(feature.paths.changelog, 'research changelog')
      ? access.readBytes(feature.paths.changelog, 'research changelog')
      : null;
    const recordBefore = recordBeforeBytes === null ? null : decodeUtf8Exact(recordBeforeBytes, 'research record');
    const changelogBefore =
      changelogBeforeBytes === null ? null : decodeUtf8Exact(changelogBeforeBytes, 'research changelog');
    const recordHash = recordBeforeBytes === null ? null : rawSha256(recordBeforeBytes);
    const changelogHash = changelogBeforeBytes === null ? null : rawSha256(changelogBeforeBytes);
    const extension = observedResearchChangelogExtension(changelogBefore, plan, validated as unknown as JsonRecord);
    const replay = recordHash === plan.record_sha256 && extension.present;
    const recordAfter = JSON.stringify(JSON.parse(canonicalJson(validated)), null, 2) + '\n';
    if (
      rawSha256(recordAfter) !== plan.record_sha256 ||
      Buffer.byteLength(recordAfter, 'utf8') > MAX_JSON_BYTES ||
      (recordHash !== plan.record_pre_sha256 && recordHash !== plan.record_sha256) ||
      (!replay && extension.present)
    )
      fail('historical research target differs from its reserved beforeimage', 'GAP-RESEARCH-DECISION-CAS-001');
    const changelogAfter = changelogBefore === null ? extension.eventLine : changelogBefore + extension.eventLine;
    if (
      Buffer.byteLength(changelogAfter, 'utf8') > MAX_JSON_BYTES ||
      changelogAfter.split('\n').length - 1 > MAX_CHANGELOG_EVENTS
    )
      fail('research changelog exceeds bound', 'GAP-RESEARCH-DECISION-CHANGELOG-BOUND-001');
    undo = async () => {
      await restoreExact(feature.paths.changelog, changelogBefore, changelogAfter, 'research changelog');
      await restoreExact(relative, recordBefore, recordAfter, 'research record');
    };
    if (!replay) {
      if (recordHash !== plan.record_sha256) {
        if (recordBefore === null) await access.writeExclusiveAsync(relative, recordAfter, 'research record');
        else await access.replaceAtomicAsync(relative, recordHash!, recordAfter, 'research record');
      }
      if (!extension.present) {
        if (changelogBefore === null)
          await access.writeExclusiveAsync(feature.paths.changelog, changelogAfter, 'research changelog');
        else
          await access.replaceAtomicAsync(
            feature.paths.changelog,
            changelogHash!,
            changelogAfter,
            'research changelog',
          );
      }
    }
    const persistedLogBytes = access.readBytes(feature.paths.changelog, 'research changelog');
    const persistedRecordBytes = access.readBytes(relative, 'research record');
    const persistedLog = decodeUtf8Exact(persistedLogBytes, 'research changelog');
    if (
      rawSha256(persistedRecordBytes) !== plan.record_sha256 ||
      !observedResearchChangelogExtension(persistedLog, plan, validated as unknown as JsonRecord).present
    )
      fail('historical research record/event pair changed after publication', 'GAP-RESEARCH-DECISION-CAS-001');
    result = {
      recordPath: relative,
      recordSha256: plan.record_sha256,
      changelogPath: feature.paths.changelog,
      changelogSha256: rawSha256(persistedLogBytes),
      replay,
    };
  };
  await access.withExclusiveLockAsync(feature.paths.changelog + '.lock', 'research record lock', async () =>
    access.withExclusiveLockAsync(history + '.lock', 'research activation history lock', async () =>
      input.host_state.withHistoricalNormalizationMutation({
        repositoryRoot: root,
        identity: input.identity,
        attempt: input.attempt,
        expectedWork: input.expectedWork,
        expectedLedger: input.expectedLedger,
        expectedJournal: input.expectedJournal,
        expectedMaintenanceGeneration: input.expectedMaintenanceGeneration,
        action: publish,
        rollback: () => undo(),
      }),
    ),
  );
  if (!result) fail('historical research publication did not complete', 'GAP-RESEARCH-DECISION-CAS-001');
  return result;
}

/** Read a completed observed pair through its current host binding and exact durable byte plan. */
export async function readObservedResearchResult(
  input: ObservedResearchRecordInput & {
    readonly plan: ObservedResearchRecordPlan;
    readonly activation_use: ActivationUse;
    readonly activation_plan: ObservedActivationUseWritePlan;
  },
): Promise<ResearchResult | ResearchSynthesis> {
  const plan = validateObservedResearchRecordPlan(input.plan);
  const activationPlan = validateObservedActivationUseWritePlan(input.activation_plan);
  const root = requiredResearchRoot({ root: input.root });
  const access = repositoryAccess(root);
  return access.withExclusiveLockAsync(plan.changelog_path + '.lock', 'research record lock', () =>
    access.withExclusiveLockAsync(
      activationPlan.history_path + '.lock',
      'research activation history lock',
      async () => {
        const context = observedResearchContext(input);
        const use = validateActivationUse(input.activation_use);
        if (
          context.relative !== plan.record_path ||
          context.feature.paths.changelog !== plan.changelog_path ||
          activationPlan.history_path !== activationHistoryRelative(context.feature, input.binding.work_id) ||
          canonicalJsonDigest(plan.binding) !== canonicalJsonDigest(input.binding) ||
          canonicalJsonDigest(activationPlan.binding) !== canonicalJsonDigest(input.binding) ||
          plan.observation_digest !== canonicalJsonDigest(input.observation) ||
          plan.result_digest !== input.result.digest ||
          activationPlan.use_digest !== use.digest ||
          (context.value.instruction_activation as RecordInstructionActivation).use_id !== use.use_id
        )
          fail('observed research read plan is foreign or stale', 'GAP-RESEARCH-DECISION-CAS-001');
        const historyBytes = access.readText(activationPlan.history_path, 'activation history');
        const recordBytes = access.readText(plan.record_path, 'research record');
        const changelogBytes = access.readText(plan.changelog_path, 'research changelog');
        const history = readActivationHistory(context.root, context.feature, input.binding.work_id);
        const lines = historyBytes.split('\n');
        if (lines.at(-1) !== '' || lines.length - 1 !== history.length)
          fail('observed activation history framing changed', 'GAP-RESEARCH-DECISION-CAS-001');
        let offset = 0;
        let activationPrefixMatched = false;
        for (let index = 0; index < history.length; index += 1) {
          const before = historyBytes.slice(0, offset);
          offset += lines[index]!.length + 1;
          if (history[index]!.use_id !== use.use_id) continue;
          activationPrefixMatched =
            history[index]!.digest === use.digest &&
            (activationPlan.history_pre_sha256 === null
              ? before === ''
              : rawSha256(before) === activationPlan.history_pre_sha256) &&
            rawSha256(historyBytes.slice(0, offset)) === activationPlan.history_sha256;
        }
        if (!activationPrefixMatched)
          fail('observed activation history no longer extends its reserved write', 'GAP-RESEARCH-DECISION-CAS-001');
        const currentHistorySha256 = rawSha256(historyBytes);
        if (rawSha256(recordBytes) !== plan.record_sha256)
          fail('observed research record changed after persistence', 'GAP-RESEARCH-DECISION-CAS-001');
        if (!observedResearchChangelogExtension(changelogBytes, plan, context.value).present)
          fail('observed research changelog reserved event is missing', 'GAP-RESEARCH-DECISION-CAS-001');
        const currentChangelogSha256 = rawSha256(changelogBytes);
        const recordValue = asRecord(JSON.parse(recordBytes), 'observed research record');
        const validation = {
          root: context.root,
          feature: context.feature,
          authority_checkpoint_path: undefined,
          current_record_path: context.relative,
          activation_history_direct_read: true,
        };
        const record =
          context.kind === 'research'
            ? validateResult(recordValue, validation)
            : validateSynthesis(recordValue, validation);
        if (
          record.digest !== input.result.digest ||
          rawSha256(access.readText(activationPlan.history_path, 'activation history')) !== currentHistorySha256 ||
          rawSha256(access.readText(plan.record_path, 'research record')) !== plan.record_sha256 ||
          rawSha256(access.readText(plan.changelog_path, 'research changelog')) !== currentChangelogSha256
        )
          fail('observed research record pair changed during validation', 'GAP-RESEARCH-DECISION-CAS-001');
        return record;
      },
    ),
  );
}

function findRecord(
  root: string,
  relative: string,
  suffix: string,
  identifier: string,
  field: 'result_id' | 'bundle_id' | 'decision_id',
): JsonRecord {
  const kind = suffix === '.research.json' ? 'research' : suffix === '.synthesis.json' ? 'synthesis' : null;
  if (kind === null) fail('record suffix is unsupported', 'GAP-RESEARCH-REFERENCE-001');
  const feature = settings(root);
  const expectedRelative = kind === 'research' ? feature.paths.research_records : feature.paths.research_records;
  if (relative !== expectedRelative) fail('record lookup directory is not canonical', 'GAP-RESEARCH-DECISION-PATH-001');
  const entry = canonicalDirectoryRecords(root, feature, kind).find(
    (candidate) => (candidate.value as unknown as JsonRecord)[field] === identifier,
  );
  if (!entry) fail('record missing: ' + identifier, 'GAP-RESEARCH-REFERENCE-001');
  return entry.value as unknown as JsonRecord;
}
export function readResearchResult(resultId: string, options: ResearchDecisionRecordOptions = {}): ResearchResult {
  id(resultId, 'result_id');
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  const value = findRecord(root, feature.paths.research_records, '.research.json', resultId, 'result_id');
  const validated = validateResult(value, {
    root,
    feature,
    authority_checkpoint_path: options.authority_checkpoint_path,
  });
  assertReadScope(validated as unknown as JsonRecord, options);
  return validated;
}

export function readResearchSynthesis(
  bundleId: string,
  options: ResearchDecisionRecordOptions = {},
): ResearchSynthesis {
  id(bundleId, 'bundle_id');
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  const value = findRecord(root, feature.paths.research_records, '.synthesis.json', bundleId, 'bundle_id');
  const validated = validateSynthesis(value, {
    root,
    feature,
    authority_checkpoint_path: options.authority_checkpoint_path,
  });
  validateSynthesisReferences(root, feature, validated);
  validateSynthesisExternalValidation(root, feature, validated);
  assertReadScope(validated as unknown as JsonRecord, options);
  return validated;
}

export function readDecisionRecord(decisionId: string, options: ResearchDecisionRecordOptions = {}): DecisionRecord {
  id(decisionId, 'decision_id');
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  const relative = path.posix.join(feature.paths.decision_records, decisionId + '.decision.json');
  if (!repositoryAccess(root).fileExists(relative, 'decision record'))
    fail('decision record missing: ' + decisionId, 'GAP-RESEARCH-REFERENCE-001');
  const raw = validateDecision(readJson(root, relative));
  const decisionContext: DecisionValidationContext = {
    root,
    feature,
    authority_checkpoint_path: options.authority_checkpoint_path,
    current_record_path: relative,
  };
  const read = () => {
    const validated = validateDecision(readJson(root, relative), decisionContext);
    validateSupersession(root, feature, validated);
    assertReadScope(validated as unknown as JsonRecord, options);
    return validated;
  };
  if (raw.status === 'accepted') {
    const checkpoint = authorityCheckpointRelative(feature, raw, options.authority_checkpoint_path);
    return withLock(root, checkpoint, read);
  }
  return read();
}

function listRecords(
  root: string,
  relative: string,
  suffix: string,
  validator: (value: JsonRecord, path: string) => CanonicalRecord,
): readonly (JsonRecord & { readonly path: string })[] {
  const kind =
    suffix === '.research.json'
      ? 'research'
      : suffix === '.synthesis.json'
        ? 'synthesis'
        : suffix === '.decision.json'
          ? 'decision'
          : null;
  if (kind === null) fail('record suffix is unsupported', 'GAP-RESEARCH-DECISION-PATH-001');
  const feature = settings(root);
  const expectedRelative = kind === 'decision' ? feature.paths.decision_records : feature.paths.research_records;
  if (relative !== expectedRelative)
    fail('record listing directory is not canonical', 'GAP-RESEARCH-DECISION-PATH-001');
  return canonicalDirectoryRecords(root, feature, kind).map((entry) => {
    const value = validator(entry.value as unknown as JsonRecord, entry.path) as unknown as JsonRecord;
    return { path: entry.path, ...value };
  });
}
export function inspectResearchRecords(
  options: ResearchDecisionRecordOptions = {},
): readonly (JsonRecord & { readonly path: string })[] {
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  return listRecords(root, feature.paths.research_records, '.research.json', (value) => {
    const validated = validateResult(value, {
      root,
      feature,
      authority_checkpoint_path: options.authority_checkpoint_path,
    });
    assertReadScope(validated as unknown as JsonRecord, options);
    return validated;
  });
}

export function inspectResearchSyntheses(
  options: ResearchDecisionRecordOptions = {},
): readonly (JsonRecord & { readonly path: string })[] {
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  return listRecords(root, feature.paths.research_records, '.synthesis.json', (value) => {
    const validated = validateSynthesis(value, {
      root,
      feature,
      authority_checkpoint_path: options.authority_checkpoint_path,
    });
    validateSynthesisReferences(root, feature, validated);
    validateSynthesisExternalValidation(root, feature, validated);
    assertReadScope(validated as unknown as JsonRecord, options);
    return validated;
  });
}

export function inspectDecisionRecords(
  options: ResearchDecisionRecordOptions = {},
): readonly (JsonRecord & { readonly path: string })[] {
  const root = requiredResearchRoot(options);
  const feature = settings(root);
  return listRecords(root, feature.paths.decision_records, '.decision.json', (value, recordPath) => {
    const context: DecisionValidationContext = {
      root,
      feature,
      authority_checkpoint_path: options.authority_checkpoint_path,
      current_record_path: recordPath,
    };
    const validated = validateDecision(value, context);
    validateSupersession(root, feature, validated);
    assertReadScope(validated as unknown as JsonRecord, options);
    return validated;
  });
}
