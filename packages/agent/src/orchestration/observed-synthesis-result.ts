import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import { runtimeConfigDigest, type AgentRuntimeConfig } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest, isPlainRecord } from '../contracts/public-ingress.js';
import type { WorkState } from '../host-state.js';
import { qualifiedResearchSourceCatalog, resolveQualifiedResearchSource } from '../research-source-catalog.js';
import {
  validateActivationUse,
  validateResearchResult,
  validateResearchSynthesis,
  validateSynthesisReferencesForResults,
  validateSynthesisExternalValidationForResults,
  type ActivationUse,
  type ResearchResult,
  type ResearchSynthesis,
} from '../research-decision.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
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
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const substantiveKeys = [
  'schema',
  'topic',
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
] as const;

export const synthesisObservationOutputContract = Object.freeze({
  schema: 'VidaSynthesisObservationOutputContract/v1',
  summary_json_schema: 'VidaSynthesisObservationOutput/v1',
  required_fields: substantiveKeys,
  evidence_refs:
    'Cite only the supplied qualified source keys r<sorted result index>:<local source ID>. The observation evidence_refs must equal the distinct keys cited in synthesis findings, conflicts, options and recommendation.',
  result_refs:
    'The host binds every completed admitted predecessor ResearchResult; the agent must not supply result_refs.',
});

function requireSynthesis(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`observed synthesis result: ${message}`);
}

function parseAccepted(bytes: Buffer, valid: (value: unknown) => boolean, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`observed synthesis result: ${label} is not JSON`);
  }
  requireSynthesis(valid(value) && isPlainRecord(value), `${label} schema is invalid`);
  return value;
}

export interface ObservedSynthesisResultInput {
  readonly config: AgentRuntimeConfig;
  readonly observation: SessionBridgeObservation;
  readonly request: SessionBridgeRequest;
  readonly issueId: string;
  readonly activationUse: ActivationUse;
  readonly work: WorkState;
  readonly scopeBytes: Buffer;
  readonly acceptanceBytes: Buffer;
  readonly workItem: LocalWorkAdmissionInput['workItem'];
  readonly researchResults: readonly ResearchResult[];
}

/** Reconstruct the exact completed predecessor set from the journal and admitted artifacts. */
export function admittedResearchResultsForSynthesis(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly work: WorkState;
  readonly workflowId: string;
}): readonly ResearchResult[] {
  const stages =
    input.config.workflows[input.workflowId]?.stages.filter((stage) => stage.produces.includes('ResearchResult/v1')) ??
    [];
  const stageIds = new Set(stages.map((stage) => stage.id));
  requireSynthesis(stages.length > 0, 'configured synthesis has no predecessor ResearchResult stage');
  const items = input.journal.state.completed
    .flatMap((wave) => wave.items)
    .filter((item) => stageIds.has(item.request.stage_id));
  requireSynthesis(
    items.length > 0 &&
      new Set(items.map((item) => item.request.action_id)).size === items.length &&
      items.every(
        (item) =>
          item.request.workflow_id === input.workflowId &&
          item.request.run_id === input.journal.state.run_id &&
          item.issue_id !== null &&
          item.observation?.status === 'reported_complete' &&
          item.observation.issue_id === item.issue_id &&
          item.observation.action_id === item.request.action_id,
      ),
    'configured predecessor research set is incomplete or mismatched',
  );
  const access = requireSafeRepositoryAccess(input.repositoryRoot);
  const results = items.map((item) => {
    const plan = item.research_normalization;
    const artifact =
      plan &&
      input.work.artifacts.find(
        (entry) =>
          entry.schema === 'ResearchResult/v1' &&
          entry.stage_id === item.request.stage_id &&
          entry.path === plan.record_path &&
          entry.sha256 === plan.record_sha256,
      );
    requireSynthesis(
      plan &&
        artifact &&
        item.research_activation &&
        plan.binding.action_id === item.request.action_id &&
        plan.binding.issue_id === item.issue_id &&
        plan.observation_digest === canonicalJsonDigest(item.observation),
      'research predecessor has no exact admitted canonical artifact',
    );
    const bytes = access.readBytes(artifact.path, 'synthesis admitted research result');
    requireSynthesis(
      bytes.length <= 64 * 1024 && sha256(bytes) === artifact.sha256,
      'admitted predecessor bytes changed',
    );
    const result = validateResearchResult(JSON.parse(bytes.toString('utf8')));
    requireSynthesis(
      result.result_id === artifact.artifact_id &&
        result.digest === plan.result_digest &&
        result.work_item_id === input.work.binding.lifecycle_work_id &&
        result.source_revision === input.work.binding.work_source_revision &&
        result.scope_id === input.work.binding.scope_id &&
        canonicalJsonDigest(result.ac_ids) === canonicalJsonDigest(input.work.binding.ac_ids),
      'admitted predecessor is foreign or stale',
    );
    return result;
  });
  requireSynthesis(
    new Set(results.map((result) => result.result_id)).size === results.length,
    'admitted predecessor result IDs are duplicate',
  );
  return results.sort((left, right) =>
    left.result_id < right.result_id ? -1 : left.result_id > right.result_id ? 1 : 0,
  );
}

/** Issue the compact catalog together with its immutable, sorted predecessor binding. */
export function synthesisSourceCatalog(results: readonly ResearchResult[]): {
  readonly result_refs: readonly { readonly result_id: string; readonly digest: string }[];
  readonly sources: readonly {
    readonly key: string;
    readonly locator: string;
    readonly claim: string;
    readonly source_kind: string;
  }[];
} {
  const result_refs = results
    .map((result) => ({ result_id: result.result_id, digest: result.digest }))
    .sort((left, right) => (left.result_id < right.result_id ? -1 : left.result_id > right.result_id ? 1 : 0));
  const sources = qualifiedResearchSourceCatalog(result_refs, results).map(({ key, source }) => ({
    key,
    locator: source.locator,
    claim: source.claim,
    source_kind: source.source_kind,
  }));
  return { result_refs, sources };
}

/** Bind agent synthesis to every admitted predecessor result and current issued action. */
export function buildObservedSynthesisResult(input: ObservedSynthesisResultInput): ResearchSynthesis {
  const { config, request, issueId, work, workItem } = input;
  const observation = parseSessionBridgeObservation(input.observation);
  const activation = validateActivationUse(input.activationUse);
  const scope = parseAccepted(input.scopeBytes, validScope, 'accepted scope') as unknown as {
    scope_id: string;
    work_id: string;
    source_revision: string;
    ac_ids: readonly string[];
    attribution: { thread_id: string };
  };
  const acceptance = parseAccepted(input.acceptanceBytes, validAcceptance, 'accepted acceptance') as unknown as {
    scope: string;
    source_revision: string;
    ac_ids: readonly string[];
  };
  const binding = work.binding;
  const stage = config.workflows[request.workflow_id]?.stages.find((item) => item.id === request.stage_id);
  const assignment = stage?.assignments[request.assignment_index];
  requireSynthesis(
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
      stage?.kind === 'synthesize' &&
      stage.produces.includes('ResearchSynthesis/v1') &&
      assignment?.role === request.role &&
      observation.status === 'reported_complete' &&
      observation.action_id === request.action_id &&
      observation.issue_id === issueId &&
      observation.output_digest === canonicalJsonDigest(observation.summary) &&
      activation.work_item_id === binding.lifecycle_work_id &&
      activation.source_revision === binding.work_source_revision &&
      activation.scope_id === binding.scope_id &&
      activation.phase === 'plan' &&
      activation.lane === 'synthesizer',
    'native report is outside the admitted synthesis action',
  );
  let content: unknown;
  try {
    content = JSON.parse(observation.summary);
  } catch {
    throw new Error('observed synthesis result: summary is not structured JSON');
  }
  requireSynthesis(
    isPlainRecord(content) &&
      Object.keys(content).length === substantiveKeys.length &&
      Object.keys(content).every((key) => substantiveKeys.includes(key as (typeof substantiveKeys)[number])) &&
      content.schema === 'VidaSynthesisObservationOutput/v1',
    'synthesis summary has unsupported or missing fields',
  );
  const output = content as Record<string, unknown>;
  requireSynthesis(
    input.researchResults.length > 0 &&
      new Set(input.researchResults.map((result) => result.result_id)).size === input.researchResults.length &&
      input.researchResults.every(
        (result) =>
          result.schema === 'ResearchResult/v1' &&
          result.work_item_id === binding.lifecycle_work_id &&
          result.source_revision === binding.work_source_revision &&
          result.scope_id === binding.scope_id,
      ),
    'synthesis predecessor results are missing, duplicate or foreign',
  );
  const sourceCatalog = synthesisSourceCatalog(input.researchResults);
  const sourceRows = qualifiedResearchSourceCatalog(sourceCatalog.result_refs, input.researchResults);
  const cited = [
    ...((output.findings as readonly { source_refs: readonly string[] }[] | undefined) ?? []).flatMap(
      (entry) => entry.source_refs ?? [],
    ),
    ...((output.conflicts as readonly { source_refs: readonly string[] }[] | undefined) ?? []).flatMap(
      (entry) => entry.source_refs ?? [],
    ),
    ...((output.options as readonly { evidence_refs: readonly string[] }[] | undefined) ?? []).flatMap(
      (entry) => entry.evidence_refs ?? [],
    ),
    ...((output.recommendation as { evidence_refs: readonly string[] } | null)?.evidence_refs ?? []),
  ];
  requireSynthesis(
    cited.every((id) => {
      try {
        resolveQualifiedResearchSource(sourceRows, id);
        return true;
      } catch {
        return false;
      }
    }) &&
      canonicalJsonDigest([...new Set(cited)].sort()) ===
        canonicalJsonDigest([...new Set(observation.evidence_refs)].sort()),
    'synthesis evidence references differ from admitted research sources',
  );
  requireSynthesis(
    Array.isArray(output.ac_ids) &&
      canonicalJsonDigest([...output.ac_ids].sort()) ===
        canonicalJsonDigest([...(scope.ac_ids as readonly string[])].sort()) &&
      output.ac_ids.every(
        (id) =>
          typeof id === 'string' &&
          input.researchResults.some(
            (result) => result.ac_ids.includes(id) && result.source_refs.some((source) => source.claim.includes(id)),
          ),
      ),
    'synthesis AC IDs must exactly match accepted scope and be source-backed',
  );
  for (const key of ['br_ids', 'sr_ids', 'gap_ids'] as const) {
    const supported = new Set(input.researchResults.flatMap((result) => [...result[key]]));
    requireSynthesis(
      Array.isArray(output[key]) && output[key].every((id) => typeof id === 'string' && supported.has(id)),
      `synthesis ${key} are unsupported by admitted research`,
    );
  }
  const pointer = path.posix.join(config.control.work_root, 'session-handoff.v1.sqlite');
  requireSynthesis(
    !path.posix.isAbsolute(pointer) && !pointer.includes('..') && !pointer.includes('\\') && !pointer.includes(':'),
    'persisted observation pointer is unsafe',
  );
  const body = {
    schema: 'ResearchSynthesis/v1' as const,
    bundle_id: `synthesis-${request.action_id.slice(0, 40)}`,
    work_item_id: binding.lifecycle_work_id,
    source_revision: binding.work_source_revision,
    scope_id: binding.scope_id,
    topic: output.topic,
    result_refs: sourceCatalog.result_refs,
    findings: output.findings,
    uncertainties: output.uncertainties,
    conflicts: output.conflicts,
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
  const synthesis = validateResearchSynthesis({ ...body, digest: canonicalJsonDigest(body) });
  validateSynthesisReferencesForResults(synthesis, input.researchResults);
  validateSynthesisExternalValidationForResults(synthesis, input.researchResults);
  return synthesis;
}
