import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import { runtimeConfigDigest, type AgentRuntimeConfig } from '../config/runtime-config.js';
import { sessionHandoffDatabaseRelativePath } from '../config/project-paths.js';
import { canonicalJsonDigest, isPlainRecord } from '../contracts/public-ingress.js';
import type { WorkState } from '../host-state.js';
import {
  validateActivationUse,
  validateResearchResult,
  type ActivationUse,
  type ResearchResult,
} from '../research-decision.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import {
  parseSessionBridgeObservation,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';

const Ajv = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validator = new Ajv({ strict: true, allErrors: true });
const validScope = validator.compile(scopeSchema);
const validAcceptance = validator.compile(acceptanceSchema);
const substantiveKeys = [
  'schema',
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
] as const;
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Include this structured output contract in the issued research next_action. */
export const researchObservationOutputContract = Object.freeze({
  schema: 'VidaResearchObservationOutputContract/v1',
  summary_json_schema: 'VidaResearchObservationOutput/v1',
  required_fields: substantiveKeys,
  evidence_refs: 'The observation evidence_refs must equal the source_refs source_id set.',
});

function requireResearch(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`observed research result: ${message}`);
}

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

function parsedObject(bytes: Buffer, valid: (value: unknown) => boolean, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`observed research result: ${label} is not JSON`);
  }
  requireResearch(valid(value) && isPlainRecord(value), `${label} schema is invalid`);
  return value;
}

export interface ObservedResearchResultInput {
  readonly config: AgentRuntimeConfig;
  readonly observation: SessionBridgeObservation;
  readonly request: SessionBridgeRequest;
  readonly issueId: string;
  readonly activationUse: ActivationUse;
  readonly work: WorkState;
  readonly scopeBytes: Buffer;
  readonly acceptanceBytes: Buffer;
  readonly workItem: LocalWorkAdmissionInput['workItem'];
}

interface AcceptedScope {
  readonly schema: 'ImplementationScope/v1';
  readonly scope_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
  readonly attribution: { readonly thread_id: string };
}
interface AcceptedManifest {
  readonly schema: 'AcceptanceManifest/v1';
  readonly scope: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
}

/** Convert one persisted native research report; only substantive fields come from the agent. */
export function buildObservedResearchResult(input: ObservedResearchResultInput): ResearchResult {
  const { config, request, issueId, work, workItem } = input;
  const observation = parseSessionBridgeObservation(input.observation);
  const activation = validateActivationUse(input.activationUse);
  const scope = parsedObject(input.scopeBytes, validScope, 'accepted scope') as unknown as AcceptedScope;
  const acceptance = parsedObject(
    input.acceptanceBytes,
    validAcceptance,
    'accepted acceptance',
  ) as unknown as AcceptedManifest;
  const binding = work.binding;
  const stage = config.workflows[request.workflow_id]?.stages.find((item) => item.id === request.stage_id);
  const assignment = stage?.assignments[request.assignment_index];
  requireResearch(
    work.schema === 'WorkState/v1' &&
      work.lease !== null &&
      work.execution.run_id === request.run_id &&
      work.execution.status === 'active' &&
      workItem.id === binding.provider_work_item_id &&
      canonicalJsonDigest(workItem) === binding.work_item_digest &&
      request.workflow_id === binding.workflow_id &&
      request.config_digest === runtimeConfigDigest(config) &&
      request.config_digest === binding.config_digest &&
      request.scope_digest === binding.work_source_revision &&
      request.scope_digest === scope.source_revision &&
      request.scope_digest === acceptance.source_revision &&
      scope.schema === 'ImplementationScope/v1' &&
      acceptance.schema === 'AcceptanceManifest/v1' &&
      scope.scope_id === binding.scope_id &&
      acceptance.scope === scope.scope_id &&
      scope.work_id === binding.lifecycle_work_id &&
      sha256(input.scopeBytes) === work.contracts.scope.sha256 &&
      sha256(input.scopeBytes) === binding.scope_contract_digest &&
      sha256(input.acceptanceBytes) === work.contracts.acceptance.sha256 &&
      sha256(input.acceptanceBytes) === binding.acceptance_manifest_digest &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(acceptance.ac_ids) &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
      scope.attribution?.thread_id === work.lease.thread_id &&
      stage?.kind === 'research' &&
      assignment?.role === request.role &&
      observation.status === 'reported_complete' &&
      observation.action_id === request.action_id &&
      observation.issue_id === issueId &&
      observation.output_digest === canonicalJsonDigest(observation.summary) &&
      activation.work_item_id === binding.lifecycle_work_id &&
      activation.source_revision === binding.work_source_revision &&
      activation.scope_id === binding.scope_id,
    'native report is outside the admitted research action',
  );
  let content: unknown;
  try {
    content = JSON.parse(observation.summary);
  } catch {
    throw new Error('observed research result: research summary is not structured JSON');
  }
  requireResearch(
    isPlainRecord(content) &&
      Object.keys(content).length === substantiveKeys.length &&
      Object.keys(content).every((key) => substantiveKeys.includes(key as (typeof substantiveKeys)[number])) &&
      content.schema === 'VidaResearchObservationOutput/v1',
    'research summary has unsupported or missing fields',
  );
  const output = content as Record<string, unknown>;
  requireResearch(
    Array.isArray(output.source_refs) &&
      output.source_refs.every((source) => isPlainRecord(source) && typeof source.source_id === 'string') &&
      canonicalJsonDigest(sorted(output.source_refs.map((source) => (source as { source_id: string }).source_id))) ===
        canonicalJsonDigest(sorted(observation.evidence_refs)),
    'research sources differ from observed evidence refs',
  );
  const sourceRefs = output.source_refs as readonly { readonly source_id: string; readonly claim: string }[];
  const acIds = output.ac_ids as readonly string[];
  requireResearch(
    Boolean(Array.isArray(acIds)) &&
      canonicalJsonDigest(sorted(acIds)) === canonicalJsonDigest(sorted(scope.ac_ids)) &&
      acIds.every((id) => sourceRefs.some((source) => source.claim?.includes(id))),
    'research AC IDs must exactly match accepted scope and be source-backed',
  );
  for (const key of ['br_ids', 'sr_ids', 'gap_ids'] as const) {
    const ids = output[key];
    requireResearch(
      Array.isArray(ids) &&
        ids.every((id) => typeof id === 'string' && sourceRefs.some((source) => source.claim?.includes(id))),
      `research ${key} lack source claim support`,
    );
  }
  const pointer = sessionHandoffDatabaseRelativePath(config);
  requireResearch(
    !path.posix.isAbsolute(pointer) && !pointer.includes('..') && !pointer.includes('\\') && !pointer.includes(':'),
    'persisted observation pointer is unsafe',
  );
  const body = {
    schema: 'ResearchResult/v1' as const,
    result_id: `research-${request.action_id.slice(0, 40)}`,
    work_item_id: binding.lifecycle_work_id,
    source_revision: binding.work_source_revision,
    scope_id: binding.scope_id,
    contour: binding.scope_id,
    topic: output.topic,
    objective: output.objective,
    question: output.question,
    source_refs: output.source_refs,
    findings: output.findings,
    uncertainties: output.uncertainties,
    conflicts: output.conflicts,
    evidence_classes: output.evidence_classes,
    br_ids: output.br_ids,
    sr_ids: output.sr_ids,
    ac_ids: output.ac_ids,
    gap_ids: output.gap_ids,
    options: output.options,
    recommendation: output.recommendation,
    completeness: output.completeness,
    readiness: output.readiness,
    instruction_activation: {
      use_id: activation.use_id,
      risk: activation.risk,
      phase: activation.phase,
      lane: activation.lane,
      trigger: activation.trigger,
      required_instruction_ids: activation.required_instruction_ids,
      instruction_ids: activation.instruction_ids,
      registry_digest: activation.registry_digest,
      source_digests: activation.source_digests,
    },
    actor: observation.agent_id,
    pointer,
    created_at: activation.timestamp,
    updated_at: activation.timestamp,
  };
  return validateResearchResult({ ...body, digest: canonicalJsonDigest(body) });
}
