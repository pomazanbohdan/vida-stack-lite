import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import {
  assertLoadedRuntimeConfig,
  runtimeConfigDigest,
  selectWorkflow,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateSnapshot } from '../host-state.js';
import { validateResearchResult, type ResearchResult } from '../research-decision.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { buildConfiguredContext, type ConfiguredContext } from './configured-context.js';
import { buildDevelopmentTaskPacket, type DevelopmentTaskPacket } from './mastra-boundary.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';

const Ajv2020Constructor = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validator = new Ajv2020Constructor({ strict: true, allErrors: true });
const validScope = validator.compile(scopeSchema);
const validAcceptance = validator.compile(acceptanceSchema);
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

interface Scope {
  readonly scope_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
  readonly allowed_paths: readonly string[];
  readonly implementation_paths: readonly string[];
  readonly documentation_paths?: readonly string[];
  readonly changed_symbols: readonly string[];
  readonly non_goals: readonly string[];
  readonly test_trace: readonly string[];
  readonly attribution: { readonly thread_id: string };
}

interface Acceptance {
  readonly scope: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
  readonly contracts: readonly {
    readonly id: string;
    readonly definition: string;
    readonly sr: string;
    readonly evidence: readonly string[];
  }[];
}

export interface AdmittedDevelopmentPacketInput {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly host: HostStateSnapshot;
  readonly ledger: MastraSessionLedgerSnapshot;
  readonly workItem: LocalWorkAdmissionInput['workItem'];
  readonly selection: WorkItemSelection;
  readonly scopeBytes: Buffer;
  readonly acceptanceBytes: Buffer;
  readonly configuredContext: ConfiguredContext | null;
}

function requirePacket(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`admitted development packet: ${message}`);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

/** Cited confirmed findings retain their evidence identity without inventing a diagnostic class. */
export function citedResearchConstraints(
  result: Pick<ResearchResult, 'result_id' | 'source_refs' | 'findings'>,
): readonly string[] {
  const sources = new Set(result.source_refs.map((source) => source.source_id));
  return result.findings
    .filter((finding) => finding.status === 'confirmed')
    .map((finding) => {
      requirePacket(
        finding.source_ids.length > 0 && finding.source_ids.every((id) => sources.has(id)),
        'confirmed research finding has no matching cited source',
      );
      return `Research ${result.result_id}/${finding.finding_id} [${finding.source_ids.join(', ')}]: ${finding.statement}`;
    });
}

/** Builds a packet only from admitted, current and observed local evidence. */
export function buildAdmittedDevelopmentPacket(input: AdmittedDevelopmentPacketInput): DevelopmentTaskPacket {
  const { repositoryRoot: root, config, host, ledger, workItem, selection, configuredContext } = input;
  assertLoadedRuntimeConfig(config, root);
  const work = host.work;
  requirePacket(
    work?.schema === 'WorkState/v1' && host.ledger !== null && work.lease !== null,
    'current admitted work and lease are required',
  );
  const binding = work.binding;
  const workflowId = selectWorkflow(config, selection).workflow_id;
  requirePacket(
    binding.lifecycle_work_id === workItem.id &&
      binding.provider_work_item_id === workItem.id &&
      binding.work_item_digest === canonicalJsonDigest(workItem) &&
      binding.team_id === selection.team &&
      binding.workflow_id === workflowId &&
      binding.project_ids.includes(selection.project) &&
      workItem.project_id === selection.project &&
      workItem.intent === selection.intent &&
      workItem.canonical_kind === selection.kind &&
      canonicalJsonDigest(workItem.risk_flags) === canonicalJsonDigest(selection.risk_flags) &&
      canonicalJsonDigest(workItem.labels) === canonicalJsonDigest(selection.labels) &&
      binding.config_digest === runtimeConfigDigest(config),
    'work item, workflow or configuration differs from admission',
  );
  const claim = host.ledger.claims.find(
    (entry) =>
      entry.ticket_id === work.lease!.ticket_id &&
      entry.thread_id === work.lease!.thread_id &&
      entry.generation === work.lease!.generation,
  );
  const ticket = host.ledger.tickets.find(
    (entry) =>
      entry.ticket_id === work.lease!.ticket_id &&
      entry.thread_id === work.lease!.thread_id &&
      entry.generation === work.lease!.generation,
  );
  requirePacket(
    claim?.status === 'active' &&
      ticket?.status === 'active' &&
      typeof ticket.expires_at === 'string' &&
      Date.parse(claim.lease_expires_at) > Date.now() &&
      Date.parse(ticket.expires_at) > Date.now(),
    'current active ticket and claim are required',
  );
  const leaseExpiresAt = new Date(
    Math.min(Date.parse(claim.lease_expires_at), Date.parse(ticket.expires_at)),
  ).toISOString();
  const access = requireSafeRepositoryAccess(root);
  requirePacket(
    Buffer.isBuffer(input.scopeBytes) &&
      Buffer.isBuffer(input.acceptanceBytes) &&
      input.scopeBytes.length <= 64 * 1024 &&
      input.acceptanceBytes.length <= 64 * 1024,
    'scope and acceptance bytes must be bounded',
  );
  requirePacket(
    input.scopeBytes.equals(access.readBytes(work.contracts.scope.path, 'packet current scope')) &&
      input.acceptanceBytes.equals(access.readBytes(work.contracts.acceptance.path, 'packet current acceptance')) &&
      sha256(input.scopeBytes) === binding.scope_contract_digest &&
      sha256(input.acceptanceBytes) === binding.acceptance_manifest_digest,
    'scope or acceptance bytes differ from admission',
  );
  const scope = JSON.parse(input.scopeBytes.toString('utf8')) as Scope;
  const acceptance = JSON.parse(input.acceptanceBytes.toString('utf8')) as Acceptance;
  requirePacket(
    validScope(scope) &&
      validAcceptance(acceptance) &&
      scope.work_id === workItem.id &&
      scope.scope_id === binding.scope_id &&
      scope.attribution.thread_id === work.lease.thread_id &&
      acceptance.scope === scope.scope_id &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
      canonicalJsonDigest(acceptance.ac_ids) === canonicalJsonDigest(scope.ac_ids) &&
      canonicalJsonDigest(scope.implementation_paths) === canonicalJsonDigest(binding.implementation_paths) &&
      scope.source_revision === binding.work_source_revision &&
      acceptance.source_revision === binding.work_source_revision,
    'scope, acceptance or thread binding differs from admitted work',
  );
  const source = snapshotDeclaredSources(access, scope.allowed_paths);
  requirePacket(
    ledger.state.schema === 'MastraSessionLedger/v1' &&
      ledger.version.digest === canonicalJsonDigest(ledger.state) &&
      ledger.state.workspace_id === work.workspace_id &&
      ledger.state.work_id === workItem.id &&
      ledger.state.run_id === work.execution.run_id &&
      ledger.state.attempt >= 1,
    'persisted Mastra ledger differs from admitted work',
  );
  requirePacket(
    ledger.state.source_scope?.digest === source.digest &&
      canonicalJsonDigest(ledger.state.source_scope.entries) === canonicalJsonDigest(source.entries),
    'current scoped source differs from final observed snapshot',
  );
  const prerequisiteStages = new Set(
    config.workflows[workflowId]!.stages.filter(
      (stage) => stage.kind === 'research' || stage.kind === 'synthesize',
    ).map((stage) => stage.id),
  );
  const observed = ledger.state.completed
    .flatMap((wave) => wave.items)
    .filter((item) => prerequisiteStages.has(item.request.stage_id));
  requirePacket(
    observed.every(
      (item) =>
        item.issue_id !== null &&
        item.observation?.issue_id === item.issue_id &&
        item.observation.action_id === item.request.action_id &&
        item.observation.status === 'reported_complete' &&
        item.request.workflow_id === workflowId &&
        item.request.scope_digest === binding.work_source_revision &&
        item.request.config_digest === binding.config_digest,
    ),
    'prior research or synthesis has an unobserved, failed or mismatched action',
  );
  const researchStageIds = new Set(
    config.workflows[workflowId]!.stages.filter((stage) => stage.produces.includes('ResearchResult/v1')).map(
      (stage) => stage.id,
    ),
  );
  const researchRefs: string[] = [];
  const researchConstraints: string[] = [];
  for (const item of observed.filter((entry) => researchStageIds.has(entry.request.stage_id))) {
    const plan = item.research_normalization;
    requirePacket(
      plan &&
        item.research_activation &&
        plan.binding.action_id === item.request.action_id &&
        plan.binding.issue_id === item.issue_id &&
        plan.observation_digest === canonicalJsonDigest(item.observation) &&
        canonicalJsonDigest(plan.binding) === canonicalJsonDigest(item.research_activation.plan.binding) &&
        item.research_activation.plan.use_digest === item.research_activation.use.digest,
      'research action has no completed canonical normalization reservation',
    );
    const artifact = work.artifacts.find(
      (entry) =>
        entry.sha256 === plan.record_sha256 &&
        entry.path === plan.record_path &&
        entry.stage_id === item.request.stage_id &&
        entry.schema === 'ResearchResult/v1' &&
        entry.path.startsWith(config.research_decision.paths.research_records + '/') &&
        entry.path.endsWith('.research.json'),
    );
    requirePacket(artifact !== undefined, 'research action has no current admitted typed artifact');
    const bytes = access.readBytes(artifact.path, 'packet observed research artifact');
    requirePacket(
      bytes.length <= 64 * 1024 &&
        sha256(bytes) === artifact.sha256 &&
        JSON.parse(bytes.toString('utf8')).digest === plan.result_digest,
      'research artifact bytes differ from observed digest',
    );
    const record = JSON.parse(bytes.toString('utf8'));
    // This pair was validated before artifact admission. Later sanctioned writes may
    // advance the live source snapshot, while the admitted research bytes stay fixed.
    const result = validateResearchResult(record);
    requirePacket(
      result.result_id === record.result_id &&
        artifact.artifact_id === result.result_id &&
        canonicalJsonDigest(result) === canonicalJsonDigest(JSON.parse(bytes.toString('utf8'))) &&
        result.work_item_id === workItem.id &&
        result.scope_id === scope.scope_id &&
        result.source_revision === binding.work_source_revision &&
        canonicalJsonDigest(result.ac_ids) === canonicalJsonDigest(scope.ac_ids),
      'research result differs from admitted work',
    );
    researchRefs.push(`artifact://research/${result.result_id}/${artifact.sha256}`);
    researchConstraints.push(...citedResearchConstraints(result));
  }
  requirePacket(
    researchStageIds.size === 0 || researchRefs.length > 0,
    'research workflow needs a completed typed research artifact',
  );
  if (configuredContext !== null) {
    requirePacket(
      configuredContext.work_id === workItem.id &&
        configuredContext.attempt === ledger.state.attempt &&
        configuredContext.digest ===
          buildConfiguredContext(root, config, {
            work_id: workItem.id,
            attempt: ledger.state.attempt,
            source_ids: configuredContext.entries.filter((entry) => entry.kind !== 'skill').map((entry) => entry.id),
            skill_refs: configuredContext.entries
              .filter((entry) => entry.kind === 'skill')
              .map((entry) => entry.location),
          }).digest,
      'configured context is stale',
    );
  }
  const contracts = acceptance.contracts;
  requirePacket(
    contracts.length === scope.ac_ids.length &&
      canonicalJsonDigest(uniqueSorted(contracts.map((entry) => entry.id))) ===
        canonicalJsonDigest(uniqueSorted(scope.ac_ids)),
    'acceptance contracts do not cover admitted ACs',
  );
  const packetId =
    'packet-' +
    canonicalJsonDigest({
      work: workItem.id,
      attempt: ledger.state.attempt,
      scope: binding.scope_contract_digest,
      acceptance: binding.acceptance_manifest_digest,
      prerequisite_observations: observed.map((item) =>
        canonicalJsonDigest({
          request: item.request,
          issue_id: item.issue_id,
          observation: item.observation,
        }),
      ),
    }).slice(0, 40);
  const codeRefs = source.entries
    .filter((entry) => entry.exists && scope.implementation_paths.includes(entry.path))
    .map((entry) => entry.path);
  const documentationRefs =
    configuredContext?.entries.filter((entry) => entry.kind === 'local').map((entry) => entry.location) ?? [];
  return buildDevelopmentTaskPacket(config, {
    packet_id: packetId,
    work_item_id: workItem.id,
    team_id: selection.team,
    workflow_id: workflowId,
    work_item: {
      kind: selection.kind,
      intent: selection.intent,
      project: selection.project,
      risk_flags: [...selection.risk_flags],
      labels: [...selection.labels],
    },
    attempt: ledger.state.attempt,
    risk_flags: [...selection.risk_flags],
    objective: workItem.description.trim() || workItem.title,
    acceptance: contracts.map((entry) => `${entry.id}: ${entry.definition}`),
    in_scope: [...scope.implementation_paths],
    out_of_scope: [...scope.non_goals],
    owned_paths: [...scope.allowed_paths],
    affected_symbols: [...scope.changed_symbols],
    skill_refs:
      configuredContext?.entries.filter((entry) => entry.kind === 'skill').map((entry) => entry.location) ?? [],
    documentation_refs: uniqueSorted([...documentationRefs, ...(scope.documentation_paths ?? [])]),
    code_evidence_refs: codeRefs,
    research_artifact_refs: researchRefs,
    diagnostics: [],
    failed_approaches: [],
    prohibited_patterns: [],
    implementation_constraints: [
      `Modify only admitted implementation paths: ${scope.implementation_paths.join(', ')}`,
      ...researchConstraints,
    ],
    security_constraints: [],
    expected_tests: [...scope.test_trace],
    delivery_conditions: contracts.map(
      (entry) => `Current evidence required for ${entry.id}: ${entry.evidence.join(', ')}`,
    ),
    source_revision: binding.work_source_revision,
    lease_expires_at: leaseExpiresAt,
  });
}
