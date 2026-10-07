import { Mastra } from '@mastra/core';
import { compileDevelopmentWorkflow, type CompiledDevelopmentWorkflow } from './workflow-plan.js';
export { compileDevelopmentWorkflow, type CompiledDevelopmentWorkflow } from './workflow-plan.js';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import type { ToolHookContext, ToolHooks } from '@mastra/core/tools';
import { LibSQLStore } from '@mastra/libsql';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import z from 'zod';
import {
  assertLoadedRuntimeConfig,
  loadRuntimeConfig,
  requireConfiguredOperation,
  runtimeConfigDigest,
  selectWorkflow,
  type AgentRoleProfile,
  type AgentRuntimeConfig,
  type WorkItemSelection,
  type WorkflowDefinition,
  type WorkflowStage,
} from '../config/runtime-config.js';
import {
  assertCanonicalJsonValue,
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
  rfc3339TimestampMilliseconds,
} from '../contracts/public-ingress.js';
import {
  safeWorkflowOwnedPath as safeOwnedPath,
  dispatchWorkflowAssignment,
  prepareWorkflowExecution,
  isRuntimeKernelHost,
  type RuntimeKernelHost,
  type WorkflowExecutionCapability,
} from '../runtime-kernel.js';

const workflowStateSchema = z
  .object({
    workItemId: z.string().min(1),
    workflowId: z.string().min(1),
    stageOutputs: z.record(
      z.string(),
      z.array(
        z
          .object({
            stageId: z.string(),
            assignmentIndex: z.number().int().nonnegative(),
            role: z.string(),
            outputDigest: z.string().regex(/^[a-f0-9]{64}$/),
            output: z.unknown(),
          })
          .strict(),
      ),
    ),
    failedAssignments: z.array(z.string()),
  })
  .strict();
export type ConfiguredWorkflowResult = z.infer<typeof workflowStateSchema>;
export interface ConfiguredMastraExecution {
  readonly workflowExecutionCapability: WorkflowExecutionCapability;
}
export interface MastraSmokeResult {
  readonly agentId: string;
  readonly workflowId: string;
  readonly dispatch: (workItemId: string) => Promise<ConfiguredWorkflowResult>;
}

export interface LibSqlSmokeResult {
  readonly reopened: boolean;
  readonly persisted: boolean;
  readonly cleanupDeferred: boolean;
}

export interface ConfiguredMastraRequest {
  readonly team_id?: string;
  readonly work_item?: Omit<WorkItemSelection, 'team'>;
}

export interface ConfiguredMastraResult extends MastraSmokeResult {
  readonly teamId: string;
  readonly profileId: string;
  readonly model: string;
  readonly reasoning: string;
  readonly workflowAllowlist: readonly string[];
  readonly toolAllowlist: readonly string[];
  readonly egressAllowlist: readonly string[];
  readonly hitlEnabled: boolean;
  readonly compiled: CompiledDevelopmentWorkflow;
  readonly hooks: ToolHooks;
}

export interface SanitizedDiagnostic {
  readonly error_class: string;
  readonly log_ref: string;
  readonly message: string;
}

export interface DevelopmentTaskPacket {
  readonly schema: 'DevelopmentTaskPacket/v1';
  readonly packet_id: string;
  readonly work_item_id: string;
  readonly team_id: string;
  readonly workflow_id: string;
  readonly work_item: Omit<WorkItemSelection, 'team'>;
  readonly attempt: number;
  readonly risk_flags: readonly string[];
  readonly objective: string;
  readonly acceptance: readonly string[];
  readonly in_scope: readonly string[];
  readonly out_of_scope: readonly string[];
  readonly owned_paths: readonly string[];
  readonly affected_symbols: readonly string[];
  readonly skill_refs: readonly string[];
  readonly documentation_refs: readonly string[];
  readonly code_evidence_refs: readonly string[];
  readonly research_artifact_refs: readonly string[];
  readonly diagnostics: readonly SanitizedDiagnostic[];
  readonly failed_approaches: readonly string[];
  readonly prohibited_patterns: readonly string[];
  readonly implementation_constraints: readonly string[];
  readonly security_constraints: readonly string[];
  readonly expected_tests: readonly string[];
  readonly delivery_conditions: readonly string[];
  readonly source_revision: string;
  readonly digest: string;
  readonly lease_expires_at: string;
}

export interface DevelopmentTaskPacketInput extends Omit<DevelopmentTaskPacket, 'schema' | 'digest' | 'diagnostics'> {
  readonly diagnostics: readonly { readonly error_class: string; readonly log_ref: string; readonly message: string }[];
}
const DEVELOPMENT_TASK_PACKET_KEYS = [
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
  'digest',
  'lease_expires_at',
] as const;

export interface ImplementationResult {
  readonly schema: 'ImplementationResult/v1';
  readonly result_id: string;
  readonly packet_id: string;
  readonly source_revision: string;
  readonly implementation_fingerprint: string;
  readonly changed_paths: readonly string[];
  readonly test_refs: readonly string[];
  readonly digest: string;
}

export interface ImplementationResultInput extends Omit<ImplementationResult, 'schema' | 'digest'> {}

export interface FailureArtifact {
  readonly schema: 'FailureArtifact/v1';
  readonly failure_id: string;
  readonly packet_id: string;
  readonly stage_id: string;
  readonly agent_role: string;
  readonly attempt: number;
  readonly error_class: string;
  readonly log_refs: readonly string[];
  readonly broken_acceptance: readonly string[];
  readonly failed_approach_fingerprint: string;
  readonly retryable: boolean;
  readonly next_route: string;
  readonly sanitized_message: string;
}

export interface FailureArtifactInput extends Omit<FailureArtifact, 'schema' | 'sanitized_message'> {
  readonly message: string;
}

export interface ValidationReceipt {
  readonly schema: 'ValidationReceipt/v1';
  readonly receipt_id: string;
  readonly packet_id: string;
  readonly packet_digest: string;
  readonly implementation_fingerprint: string;
  readonly validator_role: string;
  readonly verdict: 'pass' | 'fail';
  readonly findings: readonly string[];
  readonly evidence_refs: readonly string[];
}

export interface TestReceipt {
  readonly schema: 'TestReceipt/v1';
  readonly receipt_id: string;
  readonly instruction_id: string;
  readonly packet_id: string;
  readonly packet_digest: string;
  readonly implementation_fingerprint: string;
  readonly status: 'pass' | 'fail';
  readonly evidence_refs: readonly string[];
}

export type ValidationReceiptInput = Omit<ValidationReceipt, 'schema'>;
export type TestReceiptInput = Omit<TestReceipt, 'schema'>;

export interface DeliveryEvidenceAuthority {
  readonly issueValidationReceipt: (input: ValidationReceiptInput) => ValidationReceipt;
  readonly issueTestReceipt: (input: TestReceiptInput) => TestReceipt;
}

const trustedDeliveryEvidenceAuthorities = new WeakSet<object>();
const validationReceiptAuthorities = new WeakMap<object, DeliveryEvidenceAuthority>();
const testReceiptAuthorities = new WeakMap<object, DeliveryEvidenceAuthority>();
const VALIDATION_RECEIPT_INPUT_KEYS = [
  'receipt_id',
  'packet_id',
  'packet_digest',
  'implementation_fingerprint',
  'validator_role',
  'verdict',
  'findings',
  'evidence_refs',
] as const;
const TEST_RECEIPT_INPUT_KEYS = [
  'receipt_id',
  'instruction_id',
  'packet_id',
  'packet_digest',
  'implementation_fingerprint',
  'status',
  'evidence_refs',
] as const;

export function createDeliveryEvidenceAuthority(host: RuntimeKernelHost): DeliveryEvidenceAuthority {
  assert(isRuntimeKernelHost(host), 'delivery evidence authority requires a trusted runtime host');
  let authority!: DeliveryEvidenceAuthority;
  authority = Object.freeze({
    issueValidationReceipt: (input: ValidationReceiptInput): ValidationReceipt => {
      assertCanonicalJsonValue(input, '$');
      assert(
        isPlainRecord(input) && hasExactKeys(input, VALIDATION_RECEIPT_INPUT_KEYS),
        'validation receipt input fields are invalid',
      );
      artifactId(input.receipt_id, 'validation receipt id');
      artifactId(input.packet_id, 'validation receipt packet id');
      assert(
        typeof input.packet_digest === 'string' && /^[a-f0-9]{64}$/.test(input.packet_digest),
        'validation receipt packet digest is invalid',
      );
      assert(
        typeof input.implementation_fingerprint === 'string' && /^[a-f0-9]{64}$/.test(input.implementation_fingerprint),
        'validation receipt fingerprint is invalid',
      );
      packetText(input.validator_role, 'validation receipt validator role', 256);
      assert(input.verdict === 'pass' || input.verdict === 'fail', 'validation receipt verdict is invalid');
      packetTextList(input.findings, 'validation receipt findings');
      packetTextList(input.evidence_refs, 'validation receipt evidence', false, 512);
      const receipt = freezeJsonValue({ schema: 'ValidationReceipt/v1' as const, ...input });
      validationReceiptAuthorities.set(receipt, authority);
      return receipt;
    },
    issueTestReceipt: (input: TestReceiptInput): TestReceipt => {
      assertCanonicalJsonValue(input, '$');
      assert(
        isPlainRecord(input) && hasExactKeys(input, TEST_RECEIPT_INPUT_KEYS),
        'test receipt input fields are invalid',
      );
      artifactId(input.receipt_id, 'test receipt id');
      artifactId(input.instruction_id, 'test receipt instruction id');
      artifactId(input.packet_id, 'test receipt packet id');
      assert(
        typeof input.packet_digest === 'string' && /^[a-f0-9]{64}$/.test(input.packet_digest),
        'test receipt packet digest is invalid',
      );
      assert(
        typeof input.implementation_fingerprint === 'string' && /^[a-f0-9]{64}$/.test(input.implementation_fingerprint),
        'test receipt fingerprint is invalid',
      );
      assert(input.status === 'pass' || input.status === 'fail', 'test receipt status is invalid');
      packetTextList(input.evidence_refs, 'test receipt evidence', false, 512);
      const receipt = freezeJsonValue({ schema: 'TestReceipt/v1' as const, ...input });
      testReceiptAuthorities.set(receipt, authority);
      return receipt;
    },
  });
  trustedDeliveryEvidenceAuthorities.add(authority);
  return authority;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

export interface TesterInstruction {
  readonly schema: 'TesterInstruction/v1';
  readonly instruction_id: string;
  readonly packet_id: string;
  readonly packet_digest: string;
  readonly implementation_fingerprint: string;
  readonly expected_tests: readonly string[];
  readonly digest: string;
}

export interface DeliveryInstruction {
  readonly schema: 'DeliveryInstruction/v1';
  readonly instruction_id: string;
  readonly packet_id: string;
  readonly packet_digest: string;
  readonly implementation_fingerprint: string;
  readonly created: readonly string[];
  readonly modified: readonly string[];
  readonly deploy: readonly string[];
  readonly do_not_deploy: readonly string[];
  readonly destination: string;
  readonly order: readonly string[];
  readonly post_deployment_checks: readonly string[];
  readonly digest: string;
}

export interface DeliveryInstructionInput extends Omit<DeliveryInstruction, 'schema' | 'digest'> {
  readonly implementation_result: ImplementationResult;
}

export type DeliveryReceiptStatus = 'approved' | 'feedback' | 'rejected';

export interface DeliveryReceipt {
  readonly schema: 'DeliveryReceipt/v1';
  readonly receipt_id: string;
  readonly instruction_id: string;
  readonly instruction_digest: string;
  readonly implementation_fingerprint: string;
  readonly status: DeliveryReceiptStatus;
  readonly evidence_refs: readonly string[];
  readonly digest: string;
}

export interface DeliveryReceiptInput {
  readonly receipt_id: string;
  readonly status: DeliveryReceiptStatus;
  readonly evidence_refs: readonly string[];
}

const emptyAction = (): void => undefined;

function assert(condition: unknown, message: string): void {
  const actions: readonly (() => void)[] = [
    emptyAction,
    () => {
      throw new Error(message);
    },
  ];
  actions[Number(!condition)]!();
}

function allChecksPass(checks: readonly (() => boolean)[]): boolean {
  return checks.find((check) => !check()) === undefined;
}

function definedValue<T>(defaultValue: T, candidate: T | null | undefined): T {
  const hasValue = [candidate !== undefined, candidate !== null].every(Boolean);
  return [defaultValue, candidate][Number(hasValue)] as T;
}

function nonEmptyStringValue(value: unknown): boolean {
  const actions: readonly (() => boolean)[] = [() => false, () => Boolean((value as string).trim())];
  return actions[Number(typeof value === 'string')]!();
}

function listLengthIsValid(values: readonly unknown[], allowEmpty: boolean): boolean {
  return [values.length > 0, true][Number(allowEmpty)]!;
}

function artifactId(value: unknown, label: string): string {
  assert(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value), label + ' is invalid');
  return value as string;
}

function nonEmpty(value: unknown, label: string): string {
  assert(nonEmptyStringValue(value), label + ' is required');
  return value as string;
}

function nonEmptyList(values: readonly string[], label: string, allowEmpty = false): readonly string[] {
  assert(Array.isArray(values), label + ' must contain non-empty values');
  assert(listLengthIsValid(values, allowEmpty), label + ' must contain non-empty values');
  assert(values.every(nonEmptyStringValue), label + ' must contain non-empty values');
  assert(new Set(values).size === values.length, label + ' contains duplicates');
  return values;
}

function safeOwnedPaths(values: readonly string[], allowEmpty = false): readonly string[] {
  nonEmptyList(values, 'owned paths', allowEmpty);
  assert(values.every(safeOwnedPath), 'owned path must be repository-relative');
  return values;
}

const packetSensitivePattern =
  /(?:(?<![A-Za-z0-9_-])["']?(?:password|passphrase|secret|token|api[_-]?key|apikey|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|jwt|x-amz-(?:signature|credential|security-token)|oauth[_-](?:code|token|state)|oidc[_-](?:nonce|state)|authorization[_-]code|code_verifier|saml[_-]?response|session[_-]?id)["']?(?![A-Za-z0-9_-])\s*[:=]\s*["']?(?!Bearer\s+\[REDACTED\](?:$|[\s,;]))(?!\[REDACTED\](?:["']?(?:$|[\s,;&}])))[^&\s,"'}]+|(?:https?:\/\/|artifact:\/\/)[^\s"'<>]*[?&#](?:password|passphrase|secret|token|api[_-]?key|apikey|authorization|cookie|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|jwt|x-amz-(?:signature|credential|security-token)|oauth[_-](?:code|token|state)|oidc[_-](?:nonce|state)|authorization[_-]code|code_verifier|saml[_-]?response|session[_-]?id|code|state|nonce)\s*[=:]\s*(?!\[REDACTED\](?:["']?(?:$|[\s,;&}])))[^&#\s]+|Bearer\s+(?!\[REDACTED\](?:$|[\s,;]))[^\s,;]+|-----BEGIN [^-]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\/\/[^/\s:@]+:[^/\s@]+@)/i;

function packetText(value: unknown, label: string, maximum = 4096): string {
  assert(
    typeof value === 'string' && value.trim() && value.length <= maximum && !/\p{Cc}/u.test(value),
    label + ' is invalid',
  );
  assert(!packetSensitivePattern.test(value as string), label + ' contains sensitive material');
  return value as string;
}

function packetTextList(values: unknown, label: string, allowEmpty = true, maximum = 4096): readonly string[] {
  assert(Array.isArray(values), label + ' must be an array');
  const list = values as readonly unknown[];
  assert(listLengthIsValid(list, allowEmpty), label + ' must contain non-empty values');
  assert(
    Array.from({ length: list.length }, (_, index) => index).every((index) => Object.hasOwn(list, index)),
    label + ' contains sparse holes',
  );
  const result = list.map((value, index) => packetText(value, label + '[' + index + ']', maximum));
  assert(new Set(result).size === result.length, label + ' contains duplicates');
  return result;
}

function researchArtifactReference(value: unknown, label: string): string {
  const reference = packetText(value, label, 512);
  assert(
    /^artifact:\/\/research\/[a-z0-9][a-z0-9._-]{0,127}\/[a-f0-9]{64}$/.test(reference),
    label + ' must be a digest-bound research artifact reference',
  );
  return reference;
}

const diagnosticAssignmentPattern = /(["']?)([A-Za-z][A-Za-z0-9_-]*)\1(\s*[:=]\s*)(?:(['"])([^'"']*)\4|([^\s,;]+))/gi;
const diagnosticRedactionFieldCache = new WeakMap<AgentRuntimeConfig, readonly string[]>();
const MAX_DIAGNOSTIC_INPUT_BYTES = 4 * 1024 * 1024;
function diagnosticRedactionFields(config: AgentRuntimeConfig): readonly string[] {
  const cached = diagnosticRedactionFieldCache.get(config);
  const actions: readonly (() => readonly string[])[] = [
    () => {
      const fields = Object.freeze(
        [
          'credential',
          'password',
          'passphrase',
          'secret',
          'token',
          'apikey',
          'authorization',
          'cookie',
          'accesstoken',
          'refreshtoken',
          'clientsecret',
          'privatekey',
          'xamzsignature',
          'xamzcredential',
          'xamzsecuritytoken',
          'oauth',
          'oauthcode',
          'code',
          'sig',
          'signature',
          'jwt',
          'saml',
          'samlresponse',
          'session',
          'sessionid',
          'state',
          ...config.observability.redact_fields,
        ]
          .map((field) => field.replace(/[^A-Za-z0-9]/g, '').toLowerCase())
          .filter(Boolean),
      );
      diagnosticRedactionFieldCache.set(config, fields);
      return fields;
    },
    () => cached as readonly string[],
  ];
  return actions[Number(cached !== undefined)]!();
}

function optionalText(value: string | undefined): string {
  const hasValue = [value !== undefined, value !== null].every(Boolean);
  return ['', value][Number(hasValue)] as string;
}

function redactDiagnosticAssignment(
  fields: readonly string[],
  match: string,
  keyQuote: string,
  key: string,
  separator: string,
  valueQuote: string | undefined,
): string {
  const redact = diagnosticKeyIsSensitive(fields, key);
  return [
    match,
    keyQuote + key + keyQuote + separator + optionalText(valueQuote) + '[REDACTED]' + optionalText(valueQuote),
  ][Number(redact)]!;
}

function diagnosticKeyIsSensitive(fields: readonly string[], key: string): boolean {
  const normalizedKey = key.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return fields.some((field) => normalizedKey.includes(field));
}

function redactStructuredDiagnosticValue(fields: readonly string[], value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactStructuredDiagnosticValue(fields, item));
  if (typeof value === 'string') return redactStructuredDiagnostic(fields, value) ?? value;
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      diagnosticKeyIsSensitive(fields, key) ? '[REDACTED]' : redactStructuredDiagnosticValue(fields, nestedValue),
    ]),
  );
}

function redactStructuredDiagnostic(fields: readonly string[], value: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) && !isPlainRecord(parsed)) return undefined;
    return JSON.stringify(redactStructuredDiagnosticValue(fields, parsed));
  } catch {
    return undefined;
  }
}

function truncateDiagnostic(output: string, limit: number): string {
  const actions: readonly (() => string)[] = [
    () => Buffer.from(output, 'utf8').subarray(0, limit).toString('utf8'),
    () => output,
  ];
  return actions[Number(Buffer.byteLength(output, 'utf8') <= limit)]!();
}

export function sanitizeDiagnostic(config: AgentRuntimeConfig, value: string): string {
  const fields = diagnosticRedactionFields(config);
  assert(Buffer.byteLength(value, 'utf8') <= MAX_DIAGNOSTIC_INPUT_BYTES, 'diagnostic message exceeds bounded input');
  let output = nonEmpty(value, 'diagnostic message').replace(/\p{Cc}/gu, ' ');
  output = redactStructuredDiagnostic(fields, output) ?? output;
  output = output
    .replace(/(https?:\/\/[^/\s:@]+:)[^/\s@]+@/gi, '$1[REDACTED]@')
    .replace(/((?:bearer|basic)\s+)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, '[REDACTED PRIVATE KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gi, '[REDACTED JWT]')
    .replace(
      /([?&#]\s*(?:x-amz-(?:signature|credential|security-token)|oauth(?:[_-]?(?:token|code))?|access[_-]?token|refresh[_-]?token|client[_-]?secret|jwt|saml(?:response)?|session(?:id)?|state)\s*[=:]\s*)[^&#\s]+/gi,
      '$1[REDACTED]',
    )
    .replace(
      diagnosticAssignmentPattern,
      (match: string, keyQuote: string, key: string, separator: string, valueQuote: string | undefined) =>
        redactDiagnosticAssignment(fields, match, keyQuote, key, separator, valueQuote),
    )
    .replace(/secret:\/\/[^\s,;]+/gi, 'secret://[REDACTED]');
  return truncateDiagnostic(output, config.observability.max_error_log_bytes);
}

const logReferencePattern = /^(?:agent|artifact|history|issue|local|mcp|pr):\/\/[A-Za-z0-9][A-Za-z0-9._~:/#?-]*$/;

function logReference(config: AgentRuntimeConfig, value: unknown, label: string): string {
  const reference = nonEmpty(value, label);
  assert(logReferencePattern.test(reference), label + ' must be an internal artifact reference');
  const payload = reference.slice(reference.indexOf('://') + 3);
  assert(
    !payload.includes('\\') && !payload.split('/').some((segment) => segment === '.' || segment === '..'),
    label + ' contains an unsafe path',
  );
  assert(sanitizeDiagnostic(config, reference) === reference, label + ' must not contain credentials');
  return reference;
}

function validatePacketDigest(packet: DevelopmentTaskPacket): void {
  const { digest, ...unsigned } = packet;
  assert(packet.schema === 'DevelopmentTaskPacket/v1', 'development packet binding is invalid');
  assert(digest === canonicalJsonDigest(unsigned), 'development packet binding is invalid');
}

const researchArtifacts = new Set(['ResearchResult/v1', 'ResearchSynthesis/v1']);

function validatePacketDiagnostics(config: AgentRuntimeConfig, value: unknown, requireSanitized = false): void {
  assert(Array.isArray(value), 'packet diagnostics must be an array');
  const diagnostics = value as readonly unknown[];
  assert(
    Array.from({ length: diagnostics.length }, (_, index) => index).every((index) => Object.hasOwn(diagnostics, index)),
    'packet diagnostics contain sparse holes',
  );
  diagnostics.forEach((item, index) => {
    assert(isPlainRecord(item), 'packet diagnostic ' + index + ' is invalid');
    const diagnostic = item as Record<string, unknown>;
    assert(
      new Set(Object.keys(diagnostic)).size === 3 &&
        ['error_class', 'log_ref', 'message'].every((key) => Object.hasOwn(diagnostic, key)),
      'packet diagnostic fields are invalid',
    );
    artifactId(diagnostic.error_class, 'diagnostic error class');
    logReference(config, diagnostic.log_ref, 'diagnostic log reference');
    const message = diagnostic.message as string;
    assert(typeof message === 'string' && message.trim(), 'packet diagnostic message is invalid');
    const sanitized = sanitizeDiagnostic(config, message);
    assert(!requireSanitized || diagnostic.message === sanitized, 'packet diagnostic message is not sanitized');
  });
}

function validatePacketLists(
  input: DevelopmentTaskPacketInput,
  workflow: WorkflowDefinition,
  config: AgentRuntimeConfig,
  diagnosticsSanitized = false,
): void {
  packetTextList(input.acceptance, 'packet acceptance', false);
  packetTextList(input.risk_flags, 'packet risk flags');
  packetTextList(input.in_scope, 'packet in-scope items', false);
  packetTextList(input.out_of_scope, 'packet out-of-scope items');
  safeOwnedPaths(input.owned_paths);
  packetTextList(input.affected_symbols, 'packet affected symbols');
  packetTextList(input.skill_refs, 'packet skill references');
  packetTextList(input.documentation_refs, 'packet documentation references');
  packetTextList(input.code_evidence_refs, 'packet code evidence references');
  const requiresResearch = workflow.stages.some((stage) =>
    stage.produces.some((artifact) => researchArtifacts.has(artifact)),
  );
  const researchRefs = packetTextList(
    input.research_artifact_refs,
    'packet research artifact references',
    !requiresResearch,
    512,
  );
  researchRefs.forEach((reference, index) =>
    researchArtifactReference(reference, 'packet research artifact reference ' + index),
  );
  packetTextList(input.failed_approaches, 'packet failed approaches');
  packetTextList(input.prohibited_patterns, 'packet prohibited patterns');
  packetTextList(input.implementation_constraints, 'packet implementation constraints', false);
  packetTextList(input.security_constraints, 'packet security constraints');
  packetTextList(input.expected_tests, 'packet expected tests', false);
  packetTextList(input.delivery_conditions, 'packet delivery conditions', false);
  validatePacketDiagnostics(config, input.diagnostics, diagnosticsSanitized);
}

function leaseIsValid(value: string): boolean {
  const expiresAt = rfc3339TimestampMilliseconds(value);
  return expiresAt !== null && expiresAt > Date.now();
}

function attemptIsValid(attempt: number, maxAttempts: number): boolean {
  return [Number.isSafeInteger(attempt), attempt >= 1, attempt <= maxAttempts].every(Boolean);
}

function sameStringList(left: unknown, right: unknown): boolean {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function packetWorkItem(
  config: AgentRuntimeConfig,
  input: DevelopmentTaskPacketInput,
): Omit<WorkItemSelection, 'team'> {
  assert(isPlainRecord(input.work_item), 'packet work item selection is required');
  const workItem = input.work_item as Record<string, unknown>;
  const keys = ['kind', 'intent', 'project', 'risk_flags', 'labels'];
  assert(
    Object.keys(workItem).length === keys.length && keys.every((key) => Object.hasOwn(workItem, key)),
    'packet work item selection is invalid',
  );
  const kind = packetText(workItem.kind, 'packet work item kind', 64);
  const intent = packetText(workItem.intent, 'packet work item intent', 64);
  const project = packetText(workItem.project, 'packet work item project', 128);
  const riskFlags = packetTextList(workItem.risk_flags, 'packet work item risk flags');
  const labels = packetTextList(workItem.labels, 'packet work item labels');
  assert(
    ['epic', 'feature', 'pbi', 'story', 'bug', 'task', 'research'].includes(kind),
    'packet work item kind is invalid',
  );
  assert(
    ['information_research', 'implementation_new', 'implementation_change', 'bug_fix', 'task_execution'].includes(
      intent,
    ),
    'packet work item intent is invalid',
  );
  const selection = {
    team: input.team_id,
    kind: kind as WorkItemSelection['kind'],
    intent: intent as WorkItemSelection['intent'],
    project,
    risk_flags: riskFlags,
    labels,
  };
  assert(
    selectWorkflow(config, selection).workflow_id === input.workflow_id,
    'packet workflow is not bound to the selected work item',
  );
  assert(sameStringList(input.risk_flags, riskFlags), 'packet risk flags are not bound to the selected work item');
  return { kind: selection.kind, intent: selection.intent, project, risk_flags: [...riskFlags], labels: [...labels] };
}

function validatePacketShape(config: AgentRuntimeConfig, packet: DevelopmentTaskPacket): void {
  assert(isPlainRecord(packet), 'development packet fields are invalid');
  assert(
    Object.keys(packet).length === DEVELOPMENT_TASK_PACKET_KEYS.length &&
      DEVELOPMENT_TASK_PACKET_KEYS.every((key) => Object.hasOwn(packet, key)),
    'development packet fields are invalid',
  );
  assertCanonicalJsonValue(packet, '$.packet');
  validatePacketDigest(packet);
  artifactId(packet.packet_id, 'packet id');
  artifactId(packet.work_item_id, 'work item id');
  artifactId(packet.team_id, 'packet team id');
  const workflow = config.workflows[packet.workflow_id];
  assert(Boolean(workflow), 'packet workflow is unavailable');
  assert(attemptIsValid(packet.attempt, workflow!.max_attempts), 'packet attempt is outside configured bounds');
  packetText(packet.objective, 'packet objective');
  packetText(packet.source_revision, 'packet source revision');
  assert(leaseIsValid(packet.lease_expires_at), 'packet ownership lease is expired');
  validatePacketLists(packet, workflow!, config, true);
  packetWorkItem(config, packet);
}

export function buildDevelopmentTaskPacket(
  config: AgentRuntimeConfig,
  input: DevelopmentTaskPacketInput,
): DevelopmentTaskPacket {
  const operation = requireConfiguredOperation(
    config,
    'buildDevelopmentTaskPacket',
    'runtime.read',
    'read-evidence',
    'Decision',
  );
  const operationProfile = config.agents.profiles[operation.profile];
  assert(
    [operationProfile?.mutation_scope === 'none', operationProfile?.tools_policy === 'read_only'].every(Boolean),
    'configured operation profile is unavailable: buildDevelopmentTaskPacket',
  );
  artifactId(input.packet_id, 'packet id');
  artifactId(input.work_item_id, 'work item id');
  artifactId(input.team_id, 'packet team id');
  assert(Boolean(config.teams[input.team_id]?.enabled), 'packet team is unavailable');
  const workflow = config.workflows[input.workflow_id];
  assert(Boolean(workflow), 'packet workflow is unavailable');
  assert(attemptIsValid(input.attempt, workflow!.max_attempts), 'packet attempt is outside configured bounds');
  const workItem = packetWorkItem(config, input);
  packetText(input.objective, 'packet objective');
  packetText(input.source_revision, 'packet source revision');
  assert(leaseIsValid(input.lease_expires_at), 'packet ownership lease is expired');
  validatePacketLists(input, workflow!, config);
  const diagnostics = input.diagnostics.map((diagnostic) =>
    freezeJsonValue({
      error_class: artifactId(diagnostic.error_class, 'diagnostic error class'),
      log_ref: logReference(config, diagnostic.log_ref, 'diagnostic log reference'),
      message: sanitizeDiagnostic(config, diagnostic.message),
    }),
  );
  const unsigned = {
    schema: 'DevelopmentTaskPacket/v1' as const,
    packet_id: input.packet_id,
    work_item_id: input.work_item_id,
    team_id: input.team_id,
    workflow_id: input.workflow_id,
    work_item: workItem,
    attempt: input.attempt,
    risk_flags: [...input.risk_flags],
    objective: input.objective,
    acceptance: [...input.acceptance],
    in_scope: [...input.in_scope],
    out_of_scope: [...input.out_of_scope],
    owned_paths: [...input.owned_paths],
    affected_symbols: [...input.affected_symbols],
    skill_refs: [...input.skill_refs],
    documentation_refs: [...input.documentation_refs],
    code_evidence_refs: [...input.code_evidence_refs],
    research_artifact_refs: [...input.research_artifact_refs],
    diagnostics,
    failed_approaches: [...input.failed_approaches],
    prohibited_patterns: [...input.prohibited_patterns],
    implementation_constraints: [...input.implementation_constraints],
    security_constraints: [...input.security_constraints],
    expected_tests: [...input.expected_tests],
    delivery_conditions: [...input.delivery_conditions],
    source_revision: input.source_revision,
    lease_expires_at: input.lease_expires_at,
  };
  return freezeJsonValue({ ...unsigned, digest: canonicalJsonDigest(unsigned) });
}

function validateFailureArtifact(config: AgentRuntimeConfig, failure: FailureArtifact): void {
  const fields = [
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
  ];
  assert(
    isPlainRecord(failure) &&
      Object.keys(failure).length === fields.length &&
      fields.every((field) => Object.hasOwn(failure, field)),
    'failure artifact fields are invalid',
  );
  assert(failure.schema === 'FailureArtifact/v1', 'failure artifact schema is invalid');
  artifactId(failure.failure_id, 'failure id');
  artifactId(failure.packet_id, 'failure packet id');
  artifactId(failure.stage_id, 'failure stage id');
  artifactId(failure.agent_role, 'failure agent role');
  assert(Number.isSafeInteger(failure.attempt) && failure.attempt >= 1, 'failure attempt is invalid');
  artifactId(failure.error_class, 'failure error class');
  const logRefs = packetTextList(failure.log_refs, 'failure log references', false, 512);
  logRefs.forEach((reference) => logReference(config, reference, 'failure log reference'));
  packetTextList(failure.broken_acceptance, 'failure broken acceptance', false);
  assert(
    typeof failure.failed_approach_fingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(failure.failed_approach_fingerprint),
    'failure fingerprint is invalid',
  );
  assert(typeof failure.retryable === 'boolean', 'failure retryable flag is invalid');
  packetText(failure.next_route, 'failure next route', 256);
  assert(
    typeof failure.sanitized_message === 'string' && failure.sanitized_message.trim(),
    'failure sanitized message is invalid',
  );
  assert(
    failure.sanitized_message === sanitizeDiagnostic(config, failure.sanitized_message),
    'failure sanitized message is not sanitized',
  );
  packetText(failure.sanitized_message, 'failure sanitized message');
}

export function buildFailureArtifact(config: AgentRuntimeConfig, input: FailureArtifactInput): FailureArtifact {
  assertLoadedRuntimeConfig(config);
  artifactId(input.failure_id, 'failure id');
  artifactId(input.packet_id, 'failure packet id');
  artifactId(input.stage_id, 'failure stage id');
  artifactId(input.agent_role, 'failure agent role');
  assert(Number.isSafeInteger(input.attempt) && input.attempt >= 1, 'failure attempt is invalid');
  const logRefs = packetTextList(input.log_refs, 'failure log references', false, 512);
  const brokenAcceptance = packetTextList(input.broken_acceptance, 'failure broken acceptance', false);
  assert(
    typeof input.failed_approach_fingerprint === 'string' && /^[a-f0-9]{64}$/.test(input.failed_approach_fingerprint),
    'failure fingerprint is invalid',
  );
  assert(typeof input.retryable === 'boolean', 'failure retryable flag is invalid');
  const artifact = freezeJsonValue({
    schema: 'FailureArtifact/v1' as const,
    failure_id: input.failure_id,
    packet_id: input.packet_id,
    stage_id: input.stage_id,
    agent_role: input.agent_role,
    attempt: input.attempt,
    error_class: artifactId(input.error_class, 'failure error class'),
    log_refs: logRefs.map((reference) => logReference(config, reference, 'failure log reference')),
    broken_acceptance: brokenAcceptance,
    failed_approach_fingerprint: input.failed_approach_fingerprint,
    retryable: input.retryable,
    next_route: packetText(input.next_route, 'failure next route', 256),
    sanitized_message: sanitizeDiagnostic(config, input.message),
  });
  validateFailureArtifact(config, artifact);
  return artifact;
}
export function retryDevelopmentTaskPacket(
  config: AgentRuntimeConfig,
  previous: DevelopmentTaskPacket,
  failure: FailureArtifact,
  nextPacketId: string,
  leaseExpiresAt: string,
): DevelopmentTaskPacket {
  assertLoadedRuntimeConfig(config);
  validatePacketShape(config, previous);
  validateFailureArtifact(config, failure);
  artifactId(nextPacketId, 'next packet id');
  assert(nextPacketId !== previous.packet_id, 'retry must issue a new packet id');
  assert(failure.retryable, 'failure is not retryable');
  assert(failure.packet_id === previous.packet_id, 'failure is not bound to the previous packet');
  assert(failure.attempt === previous.attempt, 'failure is not bound to the previous packet');
  const workflow = config.workflows[previous.workflow_id];
  const failedStage = workflow?.stages.find((stage) => stage.id === failure.stage_id);
  assert(Boolean(failedStage), 'failure stage is not bound to the previous workflow');
  assert(
    failedStage!.assignments.some(
      (assignment) => assignment.role === failure.agent_role && assignmentMatchesRisk(assignment, previous.risk_flags),
    ),
    'failure agent is not bound to the active failed stage',
  );
  const recoveryRoutes = new Set<string>([failedStage!.id]);
  const incoming = new Map<string, string[]>();
  workflow!.stages.forEach((stage) => incoming.set(stage.id, []));
  workflow!.edges.forEach(([from, to]) => incoming.get(to)!.push(from));
  const collectRecoveryRoute = (stageId: string): void => {
    (incoming.get(stageId) ?? []).forEach((predecessor) => {
      if (!recoveryRoutes.has(predecessor)) {
        recoveryRoutes.add(predecessor);
        collectRecoveryRoute(predecessor);
      }
    });
  };
  collectRecoveryRoute(failedStage!.id);
  assert(
    recoveryRoutes.has(failure.next_route),
    'failure next route is not a valid recovery route in previous workflow',
  );
  assert(
    !previous.failed_approaches.includes(failure.failed_approach_fingerprint),
    'failed approach fingerprint was already attempted',
  );
  return buildDevelopmentTaskPacket(config, {
    ...previous,
    packet_id: nextPacketId,
    attempt: previous.attempt + 1,
    lease_expires_at: leaseExpiresAt,
    diagnostics: [
      ...previous.diagnostics,
      {
        error_class: failure.error_class,
        log_ref: failure.log_refs[0] as string,
        message: failure.sanitized_message,
      },
    ],
    failed_approaches: [...previous.failed_approaches, failure.failed_approach_fingerprint],
    prohibited_patterns: [...new Set([...previous.prohibited_patterns, failure.failed_approach_fingerprint])],
  });
}

function stageTargetIsValid(
  teamEnabled: boolean,
  workflow: WorkflowDefinition | undefined,
  stage: WorkflowStage | undefined,
): boolean {
  return allChecksPass([() => teamEnabled, () => Boolean(workflow), () => stage?.kind === 'develop']);
}

function sourceWriterIsConfigured(config: AgentRuntimeConfig, stage: WorkflowStage): boolean {
  const checks: readonly (() => boolean)[] = [
    () => stage.assignments.length === 1,
    () => stage.assignments[0]?.role === 'developer-orchestrator',
    () => config.agents.profiles[stage.assignments[0]!.profile]?.mutation_scope === 'repository_source',
  ];
  return allChecksPass(checks);
}

export function validateDevelopmentStagePacket(
  config: AgentRuntimeConfig,
  packet: DevelopmentTaskPacket,
  stageId: string,
): DevelopmentTaskPacket {
  assertLoadedRuntimeConfig(config);
  validatePacketShape(config, packet);
  const workflow = config.workflows[packet.workflow_id];
  const stage = workflow?.stages.find((candidate) => candidate.id === stageId);
  assert(
    stageTargetIsValid(Boolean(config.teams[packet.team_id]?.enabled), workflow, stage),
    'development stage packet target is invalid',
  );
  const validStage = stage as WorkflowStage;
  assert(
    validStage.consumes.includes('DevelopmentTaskPacket/v1'),
    'development stage does not consume DevelopmentTaskPacket/v1',
  );
  assert(
    sourceWriterIsConfigured(config, validStage),
    'development stage packet target is not the configured source writer',
  );
  return packet;
}

export function validateImplementationResult(packet: DevelopmentTaskPacket, result: ImplementationResult): void {
  const fields = [
    'schema',
    'result_id',
    'packet_id',
    'source_revision',
    'implementation_fingerprint',
    'changed_paths',
    'test_refs',
    'digest',
  ];
  assert(
    isPlainRecord(result) &&
      Object.keys(result).length === fields.length &&
      fields.every((field) => Object.hasOwn(result, field)),
    'implementation result fields are invalid',
  );
  assert(result.schema === 'ImplementationResult/v1', 'implementation result schema is invalid');
  artifactId(result.result_id, 'implementation result id');
  assert(result.packet_id === packet.packet_id, 'implementation result packet binding is invalid');
  assert(result.source_revision === packet.source_revision, 'implementation result source revision is stale');
  assert(
    typeof result.implementation_fingerprint === 'string' && /^[a-f0-9]{64}$/.test(result.implementation_fingerprint),
    'implementation result fingerprint is invalid',
  );
  const changedPaths = safeOwnedPaths(result.changed_paths, true);
  const ownedPaths = new Set(packet.owned_paths);
  changedPaths.forEach((target) =>
    assert(ownedPaths.has(target), 'implementation result path is outside packet ownership'),
  );
  packetTextList(result.test_refs, 'implementation result test references');
  const { digest, ...unsigned } = result;
  assert(digest === canonicalJsonDigest(unsigned), 'implementation result digest is invalid');
}

export function buildImplementationResult(
  packet: DevelopmentTaskPacket,
  input: ImplementationResultInput,
): ImplementationResult {
  validatePacketDigest(packet);
  artifactId(input.result_id, 'implementation result id');
  assert(input.packet_id === packet.packet_id, 'implementation result packet binding is invalid');
  assert(input.source_revision === packet.source_revision, 'implementation result source revision is stale');
  assert(
    typeof input.implementation_fingerprint === 'string' && /^[a-f0-9]{64}$/.test(input.implementation_fingerprint),
    'implementation result fingerprint is invalid',
  );
  const changedPaths = safeOwnedPaths(input.changed_paths, true);
  const ownedPaths = new Set(packet.owned_paths);
  changedPaths.forEach((target) =>
    assert(ownedPaths.has(target), 'implementation result path is outside packet ownership'),
  );
  const testRefs = packetTextList(input.test_refs, 'implementation result test references');
  const unsigned = {
    schema: 'ImplementationResult/v1' as const,
    result_id: input.result_id,
    packet_id: input.packet_id,
    source_revision: input.source_revision,
    implementation_fingerprint: input.implementation_fingerprint,
    changed_paths: [...changedPaths],
    test_refs: [...testRefs],
  };
  const result = freezeJsonValue({ ...unsigned, digest: canonicalJsonDigest(unsigned) });
  validateImplementationResult(packet, result);
  return result;
}

export function buildTesterInstruction(
  packet: DevelopmentTaskPacket,
  instructionId: string,
  implementationFingerprint: string,
): TesterInstruction {
  validatePacketDigest(packet);
  artifactId(instructionId, 'tester instruction id');
  assert(
    typeof implementationFingerprint === 'string' && /^[a-f0-9]{64}$/.test(implementationFingerprint),
    'tester instruction implementation fingerprint is invalid',
  );
  const unsigned = {
    schema: 'TesterInstruction/v1' as const,
    instruction_id: instructionId,
    packet_id: packet.packet_id,
    packet_digest: packet.digest,
    implementation_fingerprint: implementationFingerprint,
    expected_tests: [...packet.expected_tests],
  };
  return freezeJsonValue({ ...unsigned, digest: canonicalJsonDigest(unsigned) });
}
function validateReceiptReferences(config: AgentRuntimeConfig, references: unknown, label: string): readonly string[] {
  const values = packetTextList(references, label, false, 512);
  values.forEach((reference) => logReference(config, reference, label + ' reference'));
  return values;
}

function validateValidationReceipt(
  config: AgentRuntimeConfig,
  receipt: ValidationReceipt,
  packet: DevelopmentTaskPacket,
  fingerprint: string,
  authority: DeliveryEvidenceAuthority,
): void {
  assert(
    trustedDeliveryEvidenceAuthorities.has(authority) &&
      isPlainRecord(receipt) &&
      validationReceiptAuthorities.get(receipt) === authority,
    'validation receipt issuer is not authenticated',
  );
  const fields = [
    'schema',
    'receipt_id',
    'packet_id',
    'packet_digest',
    'implementation_fingerprint',
    'validator_role',
    'verdict',
    'findings',
    'evidence_refs',
  ];
  assert(
    isPlainRecord(receipt) &&
      Object.keys(receipt).length === fields.length &&
      fields.every((field) => Object.hasOwn(receipt, field)),
    'validation receipt fields are invalid',
  );
  assert(receipt.schema === 'ValidationReceipt/v1', 'validation receipt schema is invalid');
  artifactId(receipt.receipt_id, 'validation receipt id');
  assert(
    receipt.packet_id === packet.packet_id && receipt.packet_digest === packet.digest,
    'validation receipt packet binding is invalid',
  );
  assert(receipt.implementation_fingerprint === fingerprint, 'validation receipt implementation binding is invalid');
  packetText(receipt.validator_role, 'validation receipt validator role', 256);
  assert(receipt.verdict === 'pass' || receipt.verdict === 'fail', 'validation receipt verdict is invalid');
  packetTextList(receipt.findings, 'validation receipt findings');
  validateReceiptReferences(config, receipt.evidence_refs, 'validation receipt evidence');
}
function validateTesterInstruction(packet: DevelopmentTaskPacket, testerInstruction: TesterInstruction): void {
  const fields = [
    'schema',
    'instruction_id',
    'packet_id',
    'packet_digest',
    'implementation_fingerprint',
    'expected_tests',
    'digest',
  ];
  assert(
    isPlainRecord(testerInstruction) &&
      Object.keys(testerInstruction).length === fields.length &&
      fields.every((field) => Object.hasOwn(testerInstruction, field)),
    'tester instruction fields are invalid',
  );
  assert(testerInstruction.schema === 'TesterInstruction/v1', 'tester instruction schema is invalid');
  artifactId(testerInstruction.instruction_id, 'tester instruction id');
  assert(
    testerInstruction.packet_id === packet.packet_id && testerInstruction.packet_digest === packet.digest,
    'tester instruction packet binding is invalid',
  );
  assert(
    typeof testerInstruction.implementation_fingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(testerInstruction.implementation_fingerprint),
    'tester instruction implementation fingerprint is invalid',
  );
  const expectedTests = packetTextList(testerInstruction.expected_tests, 'tester instruction expected tests', false);
  assert(sameStringList(expectedTests, packet.expected_tests), 'tester instruction expected tests are stale');
  assert(
    typeof testerInstruction.digest === 'string' &&
      testerInstruction.digest ===
        canonicalJsonDigest({
          schema: testerInstruction.schema,
          instruction_id: testerInstruction.instruction_id,
          packet_id: testerInstruction.packet_id,
          packet_digest: testerInstruction.packet_digest,
          implementation_fingerprint: testerInstruction.implementation_fingerprint,
          expected_tests: expectedTests,
        }),
    'tester instruction digest is invalid',
  );
}

function validateTestReceipt(
  config: AgentRuntimeConfig,
  receipt: TestReceipt,
  testerInstruction: TesterInstruction,
  packet: DevelopmentTaskPacket,
  fingerprint: string,
  authority: DeliveryEvidenceAuthority,
): void {
  assert(
    trustedDeliveryEvidenceAuthorities.has(authority) &&
      isPlainRecord(receipt) &&
      testReceiptAuthorities.get(receipt) === authority,
    'test receipt issuer is not authenticated',
  );
  const fields = [
    'schema',
    'receipt_id',
    'instruction_id',
    'packet_id',
    'packet_digest',
    'implementation_fingerprint',
    'status',
    'evidence_refs',
  ];
  assert(
    isPlainRecord(receipt) &&
      Object.keys(receipt).length === fields.length &&
      fields.every((field) => Object.hasOwn(receipt, field)),
    'test receipt fields are invalid',
  );
  assert(receipt.schema === 'TestReceipt/v1', 'test receipt schema is invalid');
  artifactId(receipt.receipt_id, 'test receipt id');
  assert(receipt.instruction_id === testerInstruction.instruction_id, 'test receipt instruction binding is invalid');
  assert(
    receipt.packet_id === packet.packet_id && receipt.packet_digest === packet.digest,
    'test receipt packet binding is invalid',
  );
  assert(receipt.implementation_fingerprint === fingerprint, 'test receipt implementation binding is invalid');
  assert(receipt.status === 'pass' || receipt.status === 'fail', 'test receipt status is invalid');
  validateReceiptReferences(config, receipt.evidence_refs, 'test receipt evidence');
}

function validationReceiptIsComplete(
  receipt: ValidationReceipt | undefined,
  packetId: string,
  packetDigest: string,
  fingerprint: string,
): boolean {
  return allChecksPass([
    () => Boolean(receipt),
    () => receipt?.schema === 'ValidationReceipt/v1',
    () => receipt?.verdict === 'pass',
    () => receipt?.packet_id === packetId,
    () => receipt?.packet_digest === packetDigest,
    () => receipt?.implementation_fingerprint === fingerprint,
  ]);
}

function testerInstructionIsComplete(
  testerInstruction: TesterInstruction,
  testerDigest: string,
  testerUnsigned: Omit<TesterInstruction, 'digest'>,
  packet: DevelopmentTaskPacket,
  input: DeliveryInstructionInput,
): boolean {
  return allChecksPass([
    () => testerInstruction.schema === 'TesterInstruction/v1',
    () => testerDigest === canonicalJsonDigest(testerUnsigned),
    () => testerInstruction.packet_id === input.packet_id,
    () => testerInstruction.packet_digest === input.packet_digest,
    () => testerInstruction.packet_digest === packet.digest,
    () => testerInstruction.implementation_fingerprint === input.implementation_fingerprint,
    () => testerInstruction.expected_tests.length === packet.expected_tests.length,
    () => testerInstruction.expected_tests.every((test, index) => test === packet.expected_tests[index]),
  ]);
}

function testReceiptIsComplete(
  testReceipt: TestReceipt,
  testerInstruction: TesterInstruction,
  input: DeliveryInstructionInput,
): boolean {
  return allChecksPass([
    () => testReceipt.schema === 'TestReceipt/v1',
    () => testReceipt.status === 'pass',
    () => testReceipt.instruction_id === testerInstruction.instruction_id,
    () => testReceipt.packet_id === input.packet_id,
    () => testReceipt.packet_digest === input.packet_digest,
    () => testReceipt.implementation_fingerprint === input.implementation_fingerprint,
  ]);
}

export function prepareDeliveryInstruction(
  config: AgentRuntimeConfig,
  packet: DevelopmentTaskPacket,
  input: DeliveryInstructionInput,
  validationReceipts: readonly ValidationReceipt[],
  testerInstruction: TesterInstruction,
  testReceipt: TestReceipt,
  evidenceAuthority: DeliveryEvidenceAuthority,
): DeliveryInstruction {
  assertLoadedRuntimeConfig(config);
  validatePacketShape(config, packet);
  const implementationResult = input.implementation_result;
  validateImplementationResult(packet, implementationResult);
  artifactId(input.instruction_id, 'delivery instruction id');
  artifactId(input.packet_id, 'delivery packet id');
  assert(
    input.packet_id === packet.packet_id && input.packet_digest === packet.digest,
    'delivery packet binding is invalid',
  );
  assert(
    input.implementation_fingerprint === implementationResult.implementation_fingerprint,
    'delivery implementation result binding is invalid',
  );
  const created = safeOwnedPaths(input.created, true);
  const modified = safeOwnedPaths(input.modified, true);
  const deploy = safeOwnedPaths(input.deploy);
  const doNotDeploy = safeOwnedPaths(input.do_not_deploy, true);
  const order = safeOwnedPaths(input.order);
  const postDeploymentChecks = packetTextList(input.post_deployment_checks, 'delivery post-deployment checks', false);
  const destination = packetText(input.destination, 'delivery destination', 256);
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(destination), 'delivery destination is invalid');
  const ownedPaths = new Set(packet.owned_paths);
  assert(!created.some((target) => modified.includes(target)), 'delivery created and modified path lists overlap');
  assert(
    !deploy.some((target) => doNotDeploy.includes(target)),
    'delivery deploy and do_not_deploy path lists contain contradictory intent',
  );
  [...created, ...modified, ...deploy, ...doNotDeploy].forEach((target) =>
    assert(ownedPaths.has(target), 'delivery path is outside packet ownership'),
  );
  const listedPaths = new Set([...created, ...modified, ...deploy, ...doNotDeploy]);
  const implementationChangedPaths = new Set(implementationResult.changed_paths);
  [...created, ...modified, ...deploy].forEach((target) =>
    assert(implementationChangedPaths.has(target), 'delivery path is not covered by implementation result'),
  );
  implementationResult.changed_paths.forEach((target) =>
    assert(listedPaths.has(target), 'delivery changed paths are incomplete'),
  );
  assert(
    order.length === deploy.length && order.every((target) => deploy.includes(target)),
    'delivery order must contain exactly the deploy list',
  );
  const compiled = compileDevelopmentWorkflow(config, packet.team_id, packet.workflow_id, packet.risk_flags);
  const requiredValidators = new Set(
    compiled.waves
      .flat()
      .filter((stage) => stage.kind === 'validate' && stage.produces.includes('ValidationReceipt/v1'))
      .flatMap((stage) => stage.assignments.map((assignment) => assignment.role)),
  );
  assert(Array.isArray(validationReceipts), 'delivery validation receipts are invalid');
  const seenValidatorRoles = new Set<string>();
  validationReceipts.forEach((receipt) => {
    validateValidationReceipt(config, receipt, packet, input.implementation_fingerprint, evidenceAuthority);
    assert(requiredValidators.has(receipt.validator_role), 'delivery validation receipt role is not required');
    assert(!seenValidatorRoles.has(receipt.validator_role), 'delivery validation receipts contain duplicate roles');
    seenValidatorRoles.add(receipt.validator_role);
  });
  requiredValidators.forEach((role) => {
    const receipt = validationReceipts.find((item) => item.validator_role === role);
    assert(
      validationReceiptIsComplete(receipt, input.packet_id, input.packet_digest, input.implementation_fingerprint),
      'delivery validator gate is incomplete: ' + role,
    );
  });
  validateTesterInstruction(packet, testerInstruction);
  const { digest: testerDigest, ...testerUnsigned } = testerInstruction;
  assert(
    testerInstructionIsComplete(testerInstruction, testerDigest, testerUnsigned, packet, input),
    'delivery tester instruction gate is incomplete',
  );
  validateTestReceipt(
    config,
    testReceipt,
    testerInstruction,
    packet,
    input.implementation_fingerprint,
    evidenceAuthority,
  );
  assert(testReceiptIsComplete(testReceipt, testerInstruction, input), 'delivery test gate is incomplete');
  const unsigned = {
    schema: 'DeliveryInstruction/v1' as const,
    instruction_id: input.instruction_id,
    packet_id: input.packet_id,
    packet_digest: input.packet_digest,
    implementation_fingerprint: input.implementation_fingerprint,
    created: [...created],
    modified: [...modified],
    deploy: [...deploy],
    do_not_deploy: [...doNotDeploy],
    destination,
    order: [...order],
    post_deployment_checks: [...postDeploymentChecks],
  };
  return freezeJsonValue({ ...unsigned, digest: canonicalJsonDigest(unsigned) });
}

function validateDeliveryInstructionArtifact(instruction: DeliveryInstruction): void {
  const fields = [
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
  ];
  assert(
    isPlainRecord(instruction) &&
      Object.keys(instruction).length === fields.length &&
      fields.every((field) => Object.hasOwn(instruction, field)),
    'delivery instruction fields are invalid',
  );
  assert(instruction.schema === 'DeliveryInstruction/v1', 'delivery instruction schema is invalid');
  artifactId(instruction.instruction_id, 'delivery instruction id');
  artifactId(instruction.packet_id, 'delivery packet id');
  assert(
    typeof instruction.packet_digest === 'string' && /^[a-f0-9]{64}$/.test(instruction.packet_digest),
    'delivery instruction packet digest is invalid',
  );
  assert(
    typeof instruction.implementation_fingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(instruction.implementation_fingerprint),
    'delivery instruction fingerprint is invalid',
  );
  safeOwnedPaths(instruction.created, true);
  safeOwnedPaths(instruction.modified, true);
  safeOwnedPaths(instruction.deploy);
  safeOwnedPaths(instruction.do_not_deploy, true);
  safeOwnedPaths(instruction.order);
  assert(
    !instruction.created.some((target) => instruction.modified.includes(target)),
    'delivery created and modified path lists overlap',
  );
  assert(
    !instruction.deploy.some((target) => instruction.do_not_deploy.includes(target)),
    'delivery deploy and do_not_deploy path lists contain contradictory intent',
  );
  assert(
    instruction.order.length === instruction.deploy.length &&
      instruction.order.every((target) => instruction.deploy.includes(target)),
    'delivery order must contain exactly the deploy list',
  );
  packetTextList(instruction.post_deployment_checks, 'delivery post-deployment checks', false);
  const destination = packetText(instruction.destination, 'delivery destination', 256);
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(destination), 'delivery destination is invalid');
  const { digest, ...unsigned } = instruction;
  assert(digest === canonicalJsonDigest(unsigned), 'delivery instruction digest is invalid');
}

export function validateDeliveryReceipt(
  config: AgentRuntimeConfig,
  receipt: DeliveryReceipt,
  instruction: DeliveryInstruction,
): void {
  assertLoadedRuntimeConfig(config);
  validateDeliveryInstructionArtifact(instruction);
  const fields = [
    'schema',
    'receipt_id',
    'instruction_id',
    'instruction_digest',
    'implementation_fingerprint',
    'status',
    'evidence_refs',
    'digest',
  ];
  assert(
    isPlainRecord(receipt) &&
      Object.keys(receipt).length === fields.length &&
      fields.every((field) => Object.hasOwn(receipt, field)),
    'delivery receipt fields are invalid',
  );
  assert(receipt.schema === 'DeliveryReceipt/v1', 'delivery receipt schema is invalid');
  artifactId(receipt.receipt_id, 'delivery receipt id');
  assert(
    receipt.instruction_id === instruction.instruction_id && receipt.instruction_digest === instruction.digest,
    'delivery receipt instruction binding is invalid',
  );
  assert(
    receipt.implementation_fingerprint === instruction.implementation_fingerprint,
    'delivery receipt implementation binding is invalid',
  );
  assert(['approved', 'feedback', 'rejected'].includes(receipt.status), 'delivery receipt status is invalid');
  validateReceiptReferences(config, receipt.evidence_refs, 'delivery receipt evidence');
  const { digest, ...unsigned } = receipt;
  assert(digest === canonicalJsonDigest(unsigned), 'delivery receipt digest is invalid');
}

export function buildDeliveryReceipt(
  config: AgentRuntimeConfig,
  instruction: DeliveryInstruction,
  input: DeliveryReceiptInput,
): DeliveryReceipt {
  assertLoadedRuntimeConfig(config);
  validateDeliveryInstructionArtifact(instruction);
  artifactId(input.receipt_id, 'delivery receipt id');
  assert(['approved', 'feedback', 'rejected'].includes(input.status), 'delivery receipt status is invalid');
  const evidenceRefs = validateReceiptReferences(config, input.evidence_refs, 'delivery receipt evidence');
  const unsigned = {
    schema: 'DeliveryReceipt/v1' as const,
    receipt_id: input.receipt_id,
    instruction_id: instruction.instruction_id,
    instruction_digest: instruction.digest,
    implementation_fingerprint: instruction.implementation_fingerprint,
    status: input.status,
    evidence_refs: [...evidenceRefs],
  };
  const receipt = freezeJsonValue({ ...unsigned, digest: canonicalJsonDigest(unsigned) });
  validateDeliveryReceipt(config, receipt, instruction);
  return receipt;
}

function mastraModel(profile: AgentRoleProfile): string {
  return ['openai/' + profile.model, profile.model][Number(profile.model.includes('/'))]!;
}

function mastraRegistrationIsValid(mastra: Mastra, agent: Agent, workflow: ReturnType<typeof createWorkflow>): boolean {
  return allChecksPass([
    () => mastra.getAgent('developmentOrchestrator').id === agent.id,
    () => mastra.getWorkflow('configuredWorkflow').id === workflow.id,
  ]);
}

function collectWorkflowBranches(id: string, branchIds: readonly string[], stageId?: string) {
  return createStep({
    id,
    inputSchema: z.record(z.string(), workflowStateSchema),
    outputSchema: workflowStateSchema,
    execute: async ({ inputData }) => {
      const first = inputData[branchIds[0]!];
      assert(Boolean(first), 'configured workflow branch result is missing');
      const state: ConfiguredWorkflowResult = {
        ...first!,
        stageOutputs: { ...first!.stageOutputs },
        failedAssignments: [],
      };
      if (stageId) state.stageOutputs[stageId] = [];
      for (const branchId of branchIds) {
        const branch = inputData[branchId];
        assert(
          Boolean(branch) && branch!.workItemId === state.workItemId && branch!.workflowId === state.workflowId,
          'configured workflow branch identity mismatch',
        );
        if (stageId) state.stageOutputs[stageId]!.push(...(branch!.stageOutputs[stageId] ?? []));
        else Object.assign(state.stageOutputs, branch!.stageOutputs);
        state.failedAssignments.push(...branch!.failedAssignments);
      }
      if (!stageId)
        assert(
          state.failedAssignments.length === 0,
          'configured workflow assignment failed: ' + state.failedAssignments.join('; '),
        );
      return state;
    },
  });
}

function createExecutableStage(
  config: AgentRuntimeConfig,
  repositoryRoot: string,
  teamId: string,
  workflowId: string,
  stage: WorkflowStage,
  capability: WorkflowExecutionCapability,
  workItemDigest: string,
  workContextDigest: string,
  execution: { active: boolean; pending: Set<Promise<unknown>> },
) {
  const flow = createWorkflow({
    id: 'stage-' + stage.id,
    inputSchema: workflowStateSchema,
    outputSchema: workflowStateSchema,
  });
  const originals = config.workflows[workflowId]!.stages.find((entry) => entry.id === stage.id)!.assignments;
  const steps = stage.assignments.map((assignment) => {
    const assignmentIndex = originals.indexOf(assignment);
    assert(assignmentIndex >= 0, 'configured workflow assignment identity is invalid');
    return createStep({
      id: stage.id + '-assignment-' + assignmentIndex,
      inputSchema: workflowStateSchema,
      outputSchema: workflowStateSchema,
      execute: async ({ inputData }) => {
        if (inputData.failedAssignments.length) return inputData;
        let pending: Promise<unknown> | undefined;
        try {
          assert(execution.active, 'configured workflow execution has stopped');
          pending = dispatchWorkflowAssignment(capability, {
            repositoryRoot,
            configDigest: runtimeConfigDigest(config),
            teamId,
            workflowId,
            stageId: stage.id,
            assignmentIndex,
            workItemId: inputData.workItemId,
            workItemDigest,
            workContextDigest,
            input: { work_item_id: inputData.workItemId, stage_outputs: inputData.stageOutputs },
          });
          execution.pending.add(pending);
          const output = await pending;
          assertCanonicalJsonValue(output, '$');
          const snapshot = freezeJsonValue(JSON.parse(JSON.stringify(output)));
          return {
            ...inputData,
            stageOutputs: {
              ...inputData.stageOutputs,
              [stage.id]: [
                ...(inputData.stageOutputs[stage.id] ?? []),
                {
                  stageId: stage.id,
                  assignmentIndex,
                  role: assignment.role,
                  outputDigest: canonicalJsonDigest(snapshot),
                  output: snapshot,
                },
              ],
            },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            ...inputData,
            failedAssignments: [
              stage.id + '-assignment-' + assignmentIndex + ': ' + sanitizeDiagnostic(config, message).slice(0, 240),
            ],
          };
        } finally {
          if (pending) execution.pending.delete(pending);
        }
      },
    });
  });
  if (steps.length === 0) {
    flow.then(
      createStep({
        id: stage.id + '-not-applicable',
        inputSchema: workflowStateSchema,
        outputSchema: workflowStateSchema,
        execute: async ({ inputData }) => ({
          ...inputData,
          stageOutputs: { ...inputData.stageOutputs, [stage.id]: [] },
        }),
      }),
    );
  } else if (stage.mode === 'parallel' && steps.length > 1) {
    flow.parallel(steps).then(
      collectWorkflowBranches(
        stage.id + '-join',
        steps.map((step) => step.id),
        stage.id,
      ),
    );
  } else {
    for (const step of steps) flow.then(step);
  }
  return Object.assign(flow.commit(), { description: 'Configured stage ' + stage.id, metadata: {} });
}

function createMastraForValidatedProfile(
  profile: AgentRoleProfile,
  hooks: ToolHooks,
  workflowId: string,
  config: AgentRuntimeConfig,
  repositoryRoot: string,
  teamId: string,
  execution?: ConfiguredMastraExecution,
): MastraSmokeResult {
  const agent = new Agent({
    id: 'workflow-dispatcher',
    name: 'Workflow dispatcher',
    instructions: 'Execute the configured workflow through the trusted host.',
    model: mastraModel(profile),
    hooks,
  });
  const capability = execution?.workflowExecutionCapability;
  const dispatch = async (workItemId: string): Promise<ConfiguredWorkflowResult> => {
    nonEmpty(workItemId, 'Mastra work item id');
    assert(Boolean(capability), 'configured workflow execution requires an opaque host capability');
    const prepared = await prepareWorkflowExecution(capability!, {
      repositoryRoot,
      configDigest: runtimeConfigDigest(config),
      teamId,
      workItemId,
    });
    assert(prepared.workflowId === workflowId, 'configured workflow does not match the authoritative work item');
    const compiled = compileDevelopmentWorkflow(config, teamId, workflowId, prepared.workItem.risk_flags);
    const executionState = { active: true, pending: new Set<Promise<unknown>>() };
    const workflow = createWorkflow({
      id: workflowId,
      description: 'Host-authorized configured development workflow.',
      inputSchema: workflowStateSchema,
      outputSchema: workflowStateSchema,
    });
    for (const [index, wave] of compiled.waves.entries()) {
      const stages = wave.map((stage) =>
        createExecutableStage(
          config,
          repositoryRoot,
          teamId,
          workflowId,
          stage,
          capability!,
          prepared.workItemDigest,
          prepared.workContextDigest,
          executionState,
        ),
      );
      workflow.parallel(stages).then(
        collectWorkflowBranches(
          'wave-' + index + '-join',
          stages.map((stage) => stage.id),
        ),
      );
    }
    workflow.commit();
    const mastra = new Mastra({
      agents: { developmentOrchestrator: agent },
      workflows: { configuredWorkflow: workflow },
      logger: false,
    });
    assert(mastraRegistrationIsValid(mastra, agent, workflow), 'Mastra registration readback mismatch');
    try {
      const result = await (
        await workflow.createRun()
      ).start({ inputData: { workItemId, workflowId, stageOutputs: {}, failedAssignments: [] } });
      if (result.status !== 'success') {
        const failures =
          result.status === 'failed'
            ? sanitizeDiagnostic(config, result.error.message).slice(0, 240)
            : result.status === 'tripwire'
              ? `workflow tripwire: ${sanitizeDiagnostic(config, result.tripwire.reason).slice(0, 240)}`
              : `workflow stopped with status ${result.status}`;
        throw new Error('Mastra configured workflow execution failed: ' + failures, { cause: result });
      }
      return freezeJsonValue(result.result);
    } finally {
      executionState.active = false;
      await Promise.allSettled([...executionState.pending]);
    }
  };
  return { agentId: agent.id, workflowId, dispatch };
}

function assignmentMatchesRisk(
  assignment: { readonly risk_flags?: readonly string[] },
  riskFlags: readonly string[],
): boolean {
  const assignmentRisks = assignment.risk_flags;
  const actions: readonly (() => boolean)[] = [
    () => true,
    () => Boolean(assignmentRisks?.some((risk) => riskFlags.includes(risk))),
  ];
  return actions[Number(Boolean(assignmentRisks))]!();
}

function requestKeysAreValid(request: ConfiguredMastraRequest): boolean {
  return allChecksPass([
    () => isPlainRecord(request),
    () => Object.keys(request).every((key) => ['team_id', 'work_item'].includes(key)),
  ]);
}

function assertConfiguredMastraRequest(request: ConfiguredMastraRequest): void {
  assert(requestKeysAreValid(request), 'configured Mastra request field is invalid');
}

function selectConfiguredWorkflow(
  config: AgentRuntimeConfig,
  teamId: string,
  team: NonNullable<AgentRuntimeConfig['teams'][string]>,
  workItem: Omit<WorkItemSelection, 'team'> | undefined,
): { workflow_id: string; workflow: WorkflowDefinition | undefined } {
  const actions: readonly (() => { workflow_id: string; workflow: WorkflowDefinition | undefined })[] = [
    () => ({ workflow_id: team.default_workflow, workflow: config.workflows[team.default_workflow] }),
    () => selectWorkflow(config, { team: teamId, ...(workItem as Omit<WorkItemSelection, 'team'>) }),
  ];
  return actions[Number(Boolean(workItem))]!();
}

const externalToolNames = new Set(['web.search']);
const egressDestinationKeys = new Set(['url', 'uri', 'href', 'destination', 'target']);
const deniedToolCall = (): { readonly proceed: false; readonly output: string } => ({
  proceed: false,
  output: 'Mastra tool denied by configured role policy',
});

function egressDestinationValues(input: unknown): readonly string[] {
  const values: string[] = [];
  const visited = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      if (visited.has(value)) return;
      visited.add(value);
      value.forEach(visit);
      return;
    }
    if (!isPlainRecord(value) || visited.has(value)) return;
    visited.add(value);
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (egressDestinationKeys.has(key.toLowerCase()) && typeof nestedValue === 'string') values.push(nestedValue);
      visit(nestedValue);
    });
  };
  visit(input);
  return values;
}

function allowedEgressDestination(input: unknown, egressAllowlist: ReadonlySet<string>): boolean {
  const destinations = egressDestinationValues(input);
  if (destinations.length === 0) return false;
  return destinations.every((destination) => {
    try {
      const url = new URL(destination);
      return (
        url.protocol === 'https:' &&
        url.username === '' &&
        url.password === '' &&
        egressAllowlist.has(url.hostname.toLowerCase())
      );
    } catch {
      return false;
    }
  });
}

function allowedToolDecision(
  allowedTools: ReadonlySet<string>,
  toolName: string,
  input: unknown,
  egressAllowlist: ReadonlySet<string>,
): undefined | { readonly proceed: false; readonly output: string } {
  const actions: readonly (() => undefined | { readonly proceed: false; readonly output: string })[] = [
    () => deniedToolCall(),
    () =>
      externalToolNames.has(toolName) && !allowedEgressDestination(input, egressAllowlist)
        ? deniedToolCall()
        : undefined,
    () => undefined,
  ];
  return actions[Number(!allowedTools.has(toolName) ? 0 : externalToolNames.has(toolName) ? 1 : 2)]!();
}

export function createConfiguredMastra(
  repositoryRoot: string,
  request: ConfiguredMastraRequest = {},
  execution?: ConfiguredMastraExecution,
): ConfiguredMastraResult {
  assertConfiguredMastraRequest(request);
  const config = loadRuntimeConfig(repositoryRoot);
  const policy = config.orchestration.mastra;
  const teamId = definedValue('default-development', request.team_id);
  const team = config.teams[teamId];
  assert(Boolean(team?.enabled), 'development team is unavailable: ' + teamId);
  const selected = selectConfiguredWorkflow(config, teamId, team!, request.work_item);
  assert(Boolean(selected.workflow), 'team default workflow is unavailable');
  const compiled = compileDevelopmentWorkflow(config, teamId, selected.workflow_id, request.work_item?.risk_flags);
  const firstAssignment = compiled.waves[0]?.[0]?.assignments[0];
  const selectedProfileId = definedValue(policy.default_profile, firstAssignment?.profile);
  const profile = config.agents.profiles[selectedProfileId] as AgentRoleProfile | undefined;
  assert(Boolean(profile), 'agent role profile is not registered: ' + selectedProfileId);
  const selectedProfile = profile as AgentRoleProfile;
  const profileEgress = definedValue<readonly string[]>(
    [],
    config.agents.egress_policies[selectedProfile.egress_policy]?.allowed_hosts,
  );
  const egressAllowlist = Object.freeze(profileEgress.filter((host) => policy.egress_allowlist.includes(host)));
  const egressAllowlistSet = new Set(egressAllowlist.map((host) => host.toLowerCase()));
  const profileTools = definedValue<readonly string[]>(
    [],
    config.agents.tool_policies[selectedProfile.tools_policy]?.allowed_tools,
  );
  const allowedTools = new Set(
    profileTools.filter(
      (tool) => policy.tool_allowlist.includes(tool) && (!externalToolNames.has(tool) || egressAllowlist.length > 0),
    ),
  );
  const hooks: ToolHooks<unknown, unknown, unknown> = Object.freeze({
    beforeToolCall: ({ toolName, input }: ToolHookContext) =>
      allowedToolDecision(allowedTools, toolName, input, egressAllowlistSet),
    afterToolCall: async (_context: ToolHookContext) => {},
  });
  return {
    ...createMastraForValidatedProfile(
      selectedProfile,
      hooks,
      selected.workflow_id,
      config,
      repositoryRoot,
      teamId,
      execution,
    ),
    teamId,
    profileId: selectedProfileId,
    model: selectedProfile.model,
    reasoning: selectedProfile.reasoning,
    workflowAllowlist: policy.workflow_allowlist,
    toolAllowlist: Object.freeze([...allowedTools]),
    egressAllowlist,
    hitlEnabled: policy.hitl.enabled,
    compiled,
    hooks,
  };
}

export async function runLibSqlSmoke(): Promise<LibSqlSmokeResult> {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-runtime-new-libsql-'));
  const database = path.join(root, 'candidate.db');
  let first: LibSQLStore | undefined;
  let second: LibSQLStore | undefined;
  let reopened = false;
  let persisted = false;
  let cleanupDeferred = false;
  try {
    first = new LibSQLStore({ id: 'candidate-storage', url: 'file:' + database });
    await first.init();
    const firstMemory = await first.getStore('memory');
    assert(Boolean(firstMemory), 'Mastra LibSQL memory store unavailable');
    const now = new Date();
    await firstMemory!.saveThread({
      thread: {
        id: 'candidate-thread',
        resourceId: 'candidate-resource',
        title: 'Candidate persistence smoke',
        createdAt: now,
        updatedAt: now,
      },
    });
    await first.close();
    first = undefined;
    second = new LibSQLStore({ id: 'candidate-storage', url: 'file:' + database });
    await second.init();
    const secondMemory = await second.getStore('memory');
    reopened = Boolean(secondMemory);
    persisted = Boolean(
      await secondMemory?.getThreadById({ threadId: 'candidate-thread', resourceId: 'candidate-resource' }),
    );
  } finally {
    const cleanupResults = await Promise.allSettled([
      ...(first ? [first.close()] : []),
      ...(second ? [second.close()] : []),
      rm(root, { recursive: true, force: true }),
    ]);
    cleanupDeferred = cleanupResults.some((result) => result.status === 'rejected');
  }
  return { reopened, persisted, cleanupDeferred };
}
