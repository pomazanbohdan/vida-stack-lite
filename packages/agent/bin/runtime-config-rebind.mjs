import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readFileSync, readSync, lstatSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { canonicalJsonDigest, MAX_CANONICAL_BYTES } from '../src/contracts/public-ingress.ts';
import {
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  runtimePackageAccess,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { inspectHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { readAdmittedSessionIntake } from '../src/orchestration/admitted-session-execution.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  parseSessionBridgeRequest,
  sessionBridgeRunId,
  sessionBridgeDatabasePath,
} from '../src/orchestration/mastra-session-bridge.ts';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.mjs';
import { compareScopedSourceSnapshots, snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRunState,
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { admittedResearchResultsForSynthesis } from '../src/orchestration/observed-synthesis-result.ts';
import { standaloneRuntime } from './bun.mjs';

const requireRebind = (valid, message) => {
  if (!valid) throw new Error(`vida runtime-config rebind: ${message}`);
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const MAX_ORIGINAL_CONTEXT_EXPORT_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_REFERENCES = 16;
const MAX_CONFIGURED_CONTEXT_FILE_BYTES = 65536;
const MAX_CONFIGURED_CONTEXT_TOTAL_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_EXCERPT_CHARS = 8192;
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const receiptPath = '.agent/runtime-initialization.v1.json';
const configPath = 'agent-runtime.config.v1.yaml';
const selectorPath = '.agent/active-runtime-selector.v1.json';
const operationName = 'runtime-config-rebind-operation.v1.json';
const deliveryOperationName = 'runtime-config-delivery-operation.v1.json';
const sourceCorrectionName = 'runtime-config-source-correction-repair.v1.json';
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const ajv = new Ajv2020({ strict: true, allErrors: true });
const operationSchema = JSON.parse(
  readFileSync(new URL('../schemas/config-rebind-operation.v1.schema.json', import.meta.url)),
);
const sourceCorrectionSchema = JSON.parse(
  readFileSync(new URL('../schemas/runtime-config-source-correction-repair.v1.schema.json', import.meta.url)),
);
const validateOperation = ajv.compile(operationSchema);
const validateDeliveryOperation = ajv.compile({
  ...operationSchema,
  $id: 'https://agent-runtime.invalid/schemas/config-delivery-operation.v1.schema.json',
  properties: { ...operationSchema.properties, schema: { const: 'SourceDeliveryConfigRebindOperation/v1' } },
});
const operationValidator = (delivery) => (delivery ? validateDeliveryOperation : validateOperation);
const validateSourceCorrection = ajv.compile(sourceCorrectionSchema);
const externalSourceCorrectionReportSchema = structuredClone(sourceCorrectionSchema.$defs.report);
externalSourceCorrectionReportSchema.required = externalSourceCorrectionReportSchema.required.filter(
  (field) => field !== 'native_self_attestation',
);
delete externalSourceCorrectionReportSchema.properties.native_self_attestation;
externalSourceCorrectionReportSchema.$schema = sourceCorrectionSchema.$schema;
externalSourceCorrectionReportSchema.$defs = sourceCorrectionSchema.$defs;
const validateExternalSourceCorrectionReport = ajv.compile(externalSourceCorrectionReportSchema);
const operationDigest = (operation) =>
  canonicalJsonDigest(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1'
      ? { schema: operation.schema, plan: operation.plan }
      : operation.plan,
  );
const validateReadonlyOwner = ajv.compile(workSchema);

function hasExactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|')
  );
}

function stableVersionParts(value) {
  if (typeof value !== 'string' || !stableVersion.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

function isCurrentOrLaterStableVersion(candidate, baseline) {
  const left = stableVersionParts(candidate), right = stableVersionParts(baseline);
  if (!left || !right) return false;
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

function validateOriginalContextCollection(value) {
  if (value === undefined) return new Map();
  requireRebind(Array.isArray(value) && value.length > 0, 'original context collection must be a nonempty array');
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    requireRebind(false, 'original context collection is not JSON data');
  }
  requireRebind(
    Buffer.byteLength(serialized, 'utf8') <= MAX_ORIGINAL_CONTEXT_EXPORT_BYTES,
    'original context collection exceeds bound',
  );
  const byAction = new Map();
  for (const entry of value) {
    requireRebind(
      hasExactKeys(entry, ['action_id', 'wave_index', 'stage_id', 'work_id', 'attempt', 'context']) &&
        typeof entry.action_id === 'string' &&
        /^[a-f0-9]{64}$/.test(entry.action_id) &&
        Number.isSafeInteger(entry.wave_index) &&
        entry.wave_index >= 0 &&
        typeof entry.stage_id === 'string' &&
        entry.stage_id.length > 0 &&
        entry.stage_id.length <= 128 &&
        typeof entry.work_id === 'string' &&
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.work_id) &&
        Number.isSafeInteger(entry.attempt) &&
        entry.attempt >= 1,
      'original context action binding invalid',
    );
    requireRebind(!byAction.has(entry.action_id), 'original context action is duplicated');
    byAction.set(entry.action_id, entry);
  }
  return byAction;
}

function expectedOriginalContextEntries(config, workflowId, stageId) {
  const stage = config.workflows[workflowId]?.stages.find((candidate) => candidate.id === stageId);
  requireRebind(stage, 'original context stage is missing');
  const sourceIds = stage.context_source_ids ?? [],
    skillRefs = stage.context_skill_refs ?? [];
  requireRebind(
    Array.isArray(sourceIds) &&
      Array.isArray(skillRefs) &&
      sourceIds.length + skillRefs.length > 0 &&
      sourceIds.length + skillRefs.length <= MAX_CONFIGURED_CONTEXT_REFERENCES,
    'original context selection is invalid',
  );
  const expected = [];
  for (const id of sourceIds) {
    const matches = config.knowledge.sources.filter((candidate) => candidate.id === id);
    requireRebind(matches.length === 1, 'original context source selection is not unique');
    const source = matches[0];
    expected.push({
      id,
      kind: source.kind,
      location: source.location,
      title: source.title,
    });
  }
  for (const location of skillRefs) {
    requireRebind(
      typeof location === 'string' && /^\.codex\/skills\/[A-Za-z0-9._-]+\/SKILL\.md$/.test(location),
      'original context skill selection is invalid',
    );
    expected.push({ id: location, kind: 'skill', location, title: path.basename(path.dirname(location)) });
  }
  return expected.sort((left, right) =>
    left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}

function validateOriginalConfiguredContext(value, config, workflowId, stageId, workId, attempt) {
  requireRebind(
    hasExactKeys(value, ['schema', 'work_id', 'attempt', 'entries', 'digest']) &&
      value.schema === 'ConfiguredContext/v1' &&
      value.work_id === workId &&
      value.attempt === attempt &&
      Array.isArray(value.entries) &&
      typeof value.digest === 'string' &&
      /^[a-f0-9]{64}$/.test(value.digest),
    'original configured context body shape or identity invalid',
  );
  const expected = expectedOriginalContextEntries(config, workflowId, stageId);
  requireRebind(value.entries.length === expected.length, 'original configured context selection differs');
  let totalBytes = 0;
  for (let index = 0; index < expected.length; index++) {
    const entry = value.entries[index],
      selected = expected[index];
    requireRebind(
      hasExactKeys(entry, ['id', 'kind', 'location', 'title', 'status', 'sha256', 'bytes', 'content', 'truncated']) &&
        entry.id === selected.id &&
        entry.kind === selected.kind &&
        entry.location === selected.location &&
        entry.title === selected.title,
      'original configured context entry selection differs',
    );
    if (selected.kind === 'official') {
      requireRebind(
        entry.status === 'unfetched_reference' &&
          entry.sha256 === null &&
          entry.bytes === null &&
          entry.content === null &&
          entry.truncated === false,
        'original configured context official reference differs',
      );
      continue;
    }
    requireRebind(
      entry.status === 'local_excerpt' &&
        typeof entry.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes >= 0 &&
        entry.bytes <= MAX_CONFIGURED_CONTEXT_FILE_BYTES &&
        typeof entry.content === 'string' &&
        entry.content.length <= MAX_CONFIGURED_CONTEXT_EXCERPT_CHARS &&
        typeof entry.truncated === 'boolean',
      'original configured context local entry is invalid',
    );
    totalBytes += entry.bytes;
    requireRebind(
      totalBytes <= MAX_CONFIGURED_CONTEXT_TOTAL_BYTES,
      'original configured context exceeds aggregate limit',
    );
    const encoded = Buffer.from(entry.content, 'utf8');
    requireRebind(encoded.toString('utf8') === entry.content, 'original configured context text is invalid UTF-8');
    if (!entry.truncated) {
      requireRebind(
        encoded.length === entry.bytes && sha(encoded) === entry.sha256,
        'original configured context complete source binding differs',
      );
    }
  }
  const { digest, ...body } = value;
  requireRebind(digest === canonicalJsonDigest(body), 'original configured context self binding differs');
  return structuredClone(value);
}

function parse(args) {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    requireRebind(args[i]?.startsWith('--') && args[i + 1] && !Object.hasOwn(values, args[i]), 'invalid arguments');
    values[args[i]] = args[i + 1];
  }
  const base = ['--kind', '--mode', '--project-root', '--repair-id'];
  const planning = ['inspect', 'plan'].includes(values['--mode']);
  const keys = planning ? [...base, '--actor', '--timestamp', '--instruction-ref', '--target-config'] : base;
  if (planning && values['--kind'] === 'runtime-config-delivery') keys.push('--baseline-config');
  requireRebind(
    Object.keys(values).sort().join('|') === keys.sort().join('|') &&
      ['runtime-config', 'runtime-config-delivery'].includes(values['--kind']) &&
      ['inspect', 'plan', 'apply', 'resume', 'restore'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      identifier.test(values['--repair-id']),
    'mode, root, identity or argument set invalid',
  );
  return values;
}

function readReceipt(access, config) {
  const bytes = access.readBytes(receiptPath, 'initialization receipt');
  const value = JSON.parse(bytes.toString('utf8'));
  const schema = JSON.parse(
    runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
  );
  requireRebind(
    new Ajv2020({ strict: true, allErrors: true }).compile(schema)(value),
    'initialization receipt schema invalid',
  );
  return { bytes, value };
}

function sameIdentity(root, config, receipt) {
  const projects = config.projects.map((item) => item.project_id).sort();
  requireRebind(
    receipt.repository_id === config.repository.repository_id &&
      canonicalJsonDigest(receipt.project_ids) === canonicalJsonDigest(projects) &&
      receipt.integrations_digest === canonicalJsonDigest(config.integrations) &&
      receipt.workspace_id === deriveWorkspaceId(config.repository.repository_id, root) &&
      receipt.bundle === config.runtime.bundle,
    'initialization project/integration/workspace identity differs',
  );
  return projects;
}

const prewriterWorkflows = [
  ['implementation_new', 'develop_change'],
  ['implementation_change', 'develop_change'],
  ['bug_fix', 'develop_fix'],
  ['task_execution', 'develop_task'],
];
const prewriterRoles = ['source-planner', 'security-prewriter'];

function sameJson(left, right) {
  return canonicalJsonDigest(left) === canonicalJsonDigest(right);
}

function normalizedWorkflowEdges(edges) {
  return [...edges].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function exactPrewriterTemplateDelta(oldConfig, target) {
  if (
    oldConfig.runtime.bundle !== 'packages/agent' ||
    target.runtime.bundle !== 'packages/agent' ||
    oldConfig.projects.length !== 1 ||
    oldConfig.projects[0].project_id !== 'agent' ||
    target.agents.profiles.executor.model !== oldConfig.agents.profiles.executor.model ||
    target.agents.profiles.executor.reasoning !== oldConfig.agents.profiles.executor.reasoning ||
    prewriterRoles.some(
      (role) =>
        Object.hasOwn(oldConfig.agents.role_instructions, role) ||
        Object.hasOwn(oldConfig.teams['default-development'].roles, role),
    ) ||
    Object.hasOwn(oldConfig.artifact_contracts, 'LifecyclePreparationObservation/v1')
  )
    return false;

  let maintainedTemplate;
  try {
    const projectId = oldConfig.projects[0].project_id,
      templateYaml = runtimePackageAccess()
        .readBytes('templates/agent-runtime.config.template.v1.yaml', 'maintained prewriter workflow template')
        .toString('utf8')
        .replaceAll('{{REPOSITORY}}', oldConfig.repository.repository_id)
        .replaceAll('{{PROJECT}}', projectId)
        .replaceAll('{{BUNDLE}}', oldConfig.runtime.bundle);
    maintainedTemplate = parseRuntimeConfigYaml(templateYaml);
  } catch {
    return false;
  }
  const expectedArtifact = maintainedTemplate.artifact_contracts['LifecyclePreparationObservation/v1'];
  if (!expectedArtifact || !sameJson(target.artifact_contracts['LifecyclePreparationObservation/v1'], expectedArtifact))
    return false;
  for (const role of prewriterRoles) {
    const expectedRole = maintainedTemplate.agents.role_instructions[role],
      expectedMapping = maintainedTemplate.teams['default-development'].roles[role];
    if (
      !expectedRole ||
      !expectedMapping ||
      !sameJson(target.agents.role_instructions[role], expectedRole) ||
      target.teams['default-development'].roles[role] !== expectedMapping
    )
      return false;
  }

  const normalized = structuredClone(target);
  for (const role of prewriterRoles) {
    delete normalized.agents.role_instructions[role];
    delete normalized.teams['default-development'].roles[role];
  }
  delete normalized.artifact_contracts['LifecyclePreparationObservation/v1'];

  for (const [workflowId, developerId] of prewriterWorkflows) {
    const original = oldConfig.workflows[workflowId],
      candidate = normalized.workflows[workflowId],
      beforeReview = target.workflows[workflowId],
      originalDeveloper = original?.stages.find((stage) => stage.id === developerId),
      developer = candidate?.stages.find((stage) => stage.id === developerId),
      reviewStages = beforeReview?.stages.filter((stage) => stage.id === 'review_source_prewrite'),
      review = reviewStages?.[0],
      expectedReview = maintainedTemplate.workflows[workflowId]?.stages.find(
        (stage) => stage.id === 'review_source_prewrite',
      ),
      stageIndex = beforeReview?.stages.findIndex((stage) => stage.id === 'review_source_prewrite'),
      expectedStageIndex = maintainedTemplate.workflows[workflowId]?.stages.findIndex(
        (stage) => stage.id === 'review_source_prewrite',
      );
    if (
      !original ||
      !candidate ||
      !originalDeveloper ||
      !developer ||
      !expectedReview ||
      !review ||
      reviewStages.length !== 1 ||
      original.stages.some((stage) => stage.id === 'review_source_prewrite') ||
      !sameJson(originalDeveloper.required_after, ['synthesize_task']) ||
      !sameJson(developer.required_after, ['review_source_prewrite']) ||
      !sameJson(review, expectedReview) ||
      stageIndex !== expectedStageIndex
    )
      return false;

    const synthesizedEdge = ['synthesize_task', 'review_source_prewrite'],
      reviewEdge = ['review_source_prewrite', developerId],
      originalEdge = ['synthesize_task', developerId],
      reviewEdges = beforeReview.edges.filter((edge) => edge.includes('review_source_prewrite'));
    if (
      !sameJson(reviewEdges, [synthesizedEdge, reviewEdge]) ||
      beforeReview.edges.some((edge) => sameJson(edge, originalEdge)) ||
      !original.edges.some((edge) => sameJson(edge, originalEdge))
    )
      return false;

    candidate.stages = candidate.stages.filter((stage) => stage.id !== 'review_source_prewrite');
    developer.required_after = ['synthesize_task'];
    candidate.edges = normalizedWorkflowEdges([
      ...candidate.edges.filter((edge) => !edge.includes('review_source_prewrite')),
      originalEdge,
    ]);
  }

  const baseline = structuredClone(oldConfig);
  for (const [workflowId] of prewriterWorkflows) {
    baseline.workflows[workflowId].edges = normalizedWorkflowEdges(baseline.workflows[workflowId].edges);
  }
  return sameJson(normalized, baseline);
}

function targetConfig(access, root, oldConfig, targetPath) {
  const bytes = access.readBytes(targetPath, 'authored target YAML');
  const target = validateRuntimeConfigRepairTargetBytes(bytes, root);
  const unchanged = structuredClone(target);
  unchanged.agents.profiles.executor.model = oldConfig.agents.profiles.executor.model;
  unchanged.agents.profiles.executor.reasoning = oldConfig.agents.profiles.executor.reasoning;
  requireRebind(
    (sameJson(unchanged, oldConfig) && runtimeConfigDigest(target) !== runtimeConfigDigest(oldConfig)) ||
      exactPrewriterTemplateDelta(oldConfig, target),
    'only requested executor model/reasoning or the approved prewriter workflow template delta may change',
  );
  return { bytes, config: target };
}

/** Recovery reads historical authority without passing the ordinary current-execution gate. No initializer or engine producer runs here. */
export function inspectHistoricalOwnerContext(root, baselinePath, identity, attempt, originalContexts) {
  const originalContextByAction = validateOriginalContextCollection(originalContexts),
    usedOriginalContextActions = new Set();
  const access = requireSafeRepositoryAccess(root),
    current = loadRuntimeConfig(root);
  requireRebind(
    typeof baselinePath === 'string' && baselinePath.length <= 2048,
    'historical baseline reference invalid',
  );
  const baselineBytes = access.readBytes(baselinePath, 'original configuration');
  requireRebind(baselineBytes.length <= 1024 * 1024, 'historical baseline exceeds bound');
  const config = validateRuntimeConfigRepairTargetBytes(baselineBytes, root),
    receipt = readReceipt(access, current);
  sameIdentity(root, config, receipt.value);
  sameIdentity(root, current, receipt.value);
  requireRebind(
    config.runtime.bundle === 'packages/agent' && receipt.value.config_digest === runtimeConfigDigest(config),
    'historical baseline is not the local accepted Source configuration',
  );
  const runtime = runtimeBinding(access, config);
  requireRebind(
    receipt.value.schema_sha256 ===
      sha(runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema')),
    'historical initialization schema differs',
  );
  if (runtimeConfigDigest(current) !== runtimeConfigDigest(config)) targetConfig(access, root, config, configPath);
  const project = loadProjectSetContext(root, current, config.repository.repository_id, identity.project_ids);
  requireRebind(
    identity.repository_id === project.repository_id &&
      canonicalJsonDigest(identity.project_ids) === canonicalJsonDigest(project.project_ids) &&
      identity.integrations_digest === project.integrations_digest &&
      identity.project_ids.length === 1 &&
      Number.isSafeInteger(attempt) &&
      attempt > 0,
    'historical project or attempt differs',
  );
  const workspace = inspectHostWorkspaceDatabase(sessionHandoffDatabasePath(root, current), receipt.value.workspace_id);
  const owners = workspace.work.filter((row) => canonicalJsonDigest(row.identity) === canonicalJsonDigest(identity));
  const journals = workspace.journals.filter((row) => row.work_id === identity.work_id && row.attempt === attempt);
  requireRebind(
    owners.length === 1 && journals.length === 1,
    'historical work/journal missing or ambiguous; inert release is unsupported',
  );
  const owner = owners[0],
    journal = journals[0],
    work = owner.state,
    state = journal.state;
  const hostDatabase = database(root, current, true);
  let maintenanceGeneration;
  try {
    maintenanceGeneration = new HostStateStore(hostDatabase, state.workspace_id).readHostStateSnapshot(
      identity,
    ).maintenanceGeneration;
  } finally {
    hostDatabase.close();
  }
  requireRebind(
    work.binding.config_digest === runtimeConfigDigest(config) &&
      state.workspace_id === receipt.value.workspace_id &&
      state.attempt === attempt &&
      state.run_id === work.execution.run_id &&
      !state.corrective_execution,
    'historical work configuration or base run differs',
  );
  const file = sessionBridgeDatabasePath(root, config);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'original workflow database');
  const engine = new Database(file, { readonly: true, strict: true });
  try {
    const rows = engine
      .query('SELECT workflow_name,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(state.run_id);
    requireRebind(rows.length === 1, 'historical original engine missing or ambiguous');
    const snapshot = JSON.parse(rows[0].snapshot),
      input = parseSessionBridgeRunState(snapshot.context?.input);
    requireRebind(
      canonicalJsonDigest(input) === canonicalJsonDigest(snapshot.context.input) &&
        snapshot.status === 'suspended' &&
        snapshot.runId === state.run_id &&
        input.work_id === state.work_id &&
        input.attempt === attempt &&
        input.workflow_id === work.binding.workflow_id &&
        rows[0].workflow_name === input.workflow_id &&
        input.config_digest === work.binding.config_digest &&
        input.scope_digest === work.binding.work_source_revision &&
        input.observations.length === 0 &&
        Array.isArray(input.selection?.risk_flags) &&
        input.selection.team === work.binding.team_id &&
        input.selection.project === identity.project_ids[0],
      'historical original engine input differs',
    );
    const context = { work_id: state.work_id, attempt, scope_digest: input.scope_digest };
    requireRebind(
      sessionBridgeRunId(state.workspace_id, context, input.workflow_id) === state.run_id,
      'historical original run identity differs',
    );
    const waves = Object.entries(snapshot.context)
      .filter(([key]) => /^wave-\d+$/.test(key))
      .map(([key, value]) => ({ index: Number(key.slice(5)), value }))
      .sort((a, b) => a.index - b.index);
    const frontiers = waves.filter((entry) => entry.value?.status === 'suspended');
    requireRebind(
      frontiers.length === 1 &&
        waves.every(
          (entry, index) => entry.index === index && (entry.value.status === 'success' || entry === frontiers[0]),
        ) &&
        frontiers[0] === waves.at(-1),
      'historical engine frontier differs',
    );
    const allItems = [...state.completed.flatMap((wave) => wave.items), ...state.items];
    let prior = input,
      matched = 0;
    for (const { index, value: wave } of waves) {
      requireRebind(
        canonicalJsonDigest(wave.payload) === canonicalJsonDigest(prior),
        'historical engine wave input differs',
      );
      // Current loader brands topology only after the executor-only delta was proved.
      // Historical requests and rights retain the original configuration binding.
      const actions = sessionActionsForWave(current, input.selection, context, input.workflow_id, index, []);
      const requests = actions.map((action) => {
        const retained = originalContextByAction.get(action.action_id);
        let configuredContext;
        if (retained) {
          requireRebind(
            retained.wave_index === index &&
              retained.stage_id === action.stage_id &&
              retained.work_id === state.work_id &&
              retained.attempt === attempt,
            'original configured context action slot differs',
          );
          configuredContext = validateOriginalConfiguredContext(
            retained.context,
            config,
            input.workflow_id,
            action.stage_id,
            state.work_id,
            attempt,
          );
          usedOriginalContextActions.add(action.action_id);
        } else {
          configuredContext = configuredContextForStage(root, current, input.workflow_id, action.stage_id, context);
        }
        return buildSessionBridgeRequest({
          runId: state.run_id,
          workflowId: input.workflow_id,
          configDigest: input.config_digest,
          context,
          waveIndex: index,
          action,
          configuredContext,
          priorResults: prior.observations,
        });
      });
      const items = allItems.filter((item) => item.request.wave_index === index);
      requireRebind(
        requests.length > 0 &&
          items.length === requests.length &&
          requests.every(
            (request) =>
              items.filter(
                (item) =>
                  canonicalJsonDigest(parseSessionBridgeRequest(item.request)) === canonicalJsonDigest(request) &&
                  canonicalJsonDigest(item.request) === canonicalJsonDigest(request),
              ).length === 1,
          ),
        'historical original configured requests differ',
      );
      matched += items.length;
      if (wave.status === 'success') {
        const observations = wave.resumePayload?.observations?.map(parseSessionBridgeObservation);
        requireRebind(
          Array.isArray(observations) &&
            observations.length === items.length &&
            observations.every(
              (observation) =>
                items.filter(
                  (item) =>
                    item.issue_id === observation.issue_id &&
                    canonicalJsonDigest(item.observation) === canonicalJsonDigest(observation),
                ).length === 1,
            ) &&
            !Object.hasOwn(wave, 'suspendPayload'),
          'historical engine accepted observations differ',
        );
        prior = { ...prior, observations: [...prior.observations, ...observations] };
        requireRebind(
          canonicalJsonDigest(wave.output) === canonicalJsonDigest(prior),
          'historical engine output differs',
        );
      } else
        requireRebind(
          canonicalJsonDigest(wave.suspendPayload?.requests) === canonicalJsonDigest(requests) &&
            canonicalJsonDigest(state.items.map((item) => item.request)) === canonicalJsonDigest(requests),
          'historical engine suspended requests differ',
        );
    }
    requireRebind(
      usedOriginalContextActions.size === originalContextByAction.size,
      'original configured context collection contains an extra or foreign action',
    );
    requireRebind(matched === allItems.length, 'historical journal has extra engine actions');
    for (const item of allItems) {
      if (item.observation) {
        const observation = parseSessionBridgeObservation(item.observation);
        requireRebind(
          canonicalJsonDigest(observation) === canonicalJsonDigest(item.observation) &&
            observation.action_id === item.request.action_id &&
            observation.issue_id === item.issue_id &&
            observation.output_digest === canonicalJsonDigest(observation.summary),
          'historical terminal observation differs',
        );
      }
    }
    return {
      config,
      current,
      workspace,
      owner,
      journal,
      maintenanceGeneration,
      engine_binding: canonicalJsonDigest(snapshot),
      baseline_binding: canonicalJsonDigest(baselineBytes.toString('utf8')),
      receipt_binding: canonicalJsonDigest(receipt.value),
      runtime_binding: runtime,
    };
  } finally {
    engine.close();
  }
}

/** Narrow trusted-isolated-caller API. Native tools and durable body custody belong to that caller. */
export function openInternalRecoveryReview(input) {
  const root = input.repositoryRoot;
  requireRebind(path.isAbsolute(root) && path.resolve(root) === root, 'recovery root invalid');
  const originalContexts = input.originalContexts === undefined ? undefined : structuredClone(input.originalContexts);
  const historical = () =>
    inspectHistoricalOwnerContext(root, input.baselinePath, input.identity, input.attempt, originalContexts);
  const contextBinding = (value) => ({
    baseline: value.baseline_binding,
    receipt: value.receipt_binding,
    engine: value.engine_binding,
    current_config: runtimeConfigDigest(value.current),
    original_config: runtimeConfigDigest(value.config),
    runtime: value.runtime_binding,
    original_source: value.journal.state.source_scope?.digest,
  });
  const inspected = historical();
  const ticket = inspected.workspace.ledger?.tickets.find((t) => t.work_id === input.identity.work_id);
  requireRebind(ticket, 'original recovery owner unavailable');
  const fresh = {
    identity: input.identity,
    attempt: input.attempt,
    callerSession: input.callerSession,
    controllerId: input.controllerId,
    userInstructionRef: input.userInstructionRef,
    historicalOwner: ticket.thread_id,
    expectedWork: inspected.owner.version,
    expectedLedger: inspected.workspace.ledger_version,
    expectedJournal: inspected.journal.version,
    maintenanceGeneration: inspected.maintenanceGeneration,
    source: snapshotDeclaredSources(
      requireSafeRepositoryAccess(root),
      inspected.journal.state.source_scope.entries.map((entry) => entry.path),
    ),
    context: contextBinding(inspected),
  };
  // Exact caller history is required on resume; never reconstruct a changed request.
  const request = input.request === undefined ? fresh : input.request;
  const historicalInspection = input.mode === 'inspect' && input.request !== undefined;
  const inspectionIdentity = (value) => {
    const { runtime, ...context } = value.context;
    return { ...value, source: value.source.entries.map((entry) => entry.path), context };
  };
  requireRebind(
    canonicalJsonDigest(historicalInspection ? inspectionIdentity(request) : request) ===
      canonicalJsonDigest(historicalInspection ? inspectionIdentity(fresh) : fresh),
    'retained recovery request changed',
  );
  const frozen = JSON.parse(JSON.stringify(request));
  const db = database(root, inspected.current, input.mode === 'inspect');
  try {
    const store = new HostStateStore(
      db,
      inspected.owner.state.workspace_id,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    if (historicalInspection) {
      const operationKey = canonicalJsonDigest({
        identity: frozen.identity,
        attempt: frozen.attempt,
        action: 'recovery-review',
      });
      const operation = store.inspectOperation('vida-recovery-reviews', operationKey);
      requireRebind(
        operation && operation.request_digest === canonicalJsonDigest(frozen),
        'recovery retained request differs',
      );
      const readonly = () => {
        throw new Error('vida runtime-config rebind: inspection grants no recovery effects');
      };
      return Object.freeze({
        request: structuredClone(frozen),
        operation,
        inspect: () => store.inspectOperation('vida-recovery-reviews', operationKey),
        begin: readonly,
        complete: readonly,
        close: () => db.close(),
      });
    }
    const handle = store.openRecoveryReview(
      frozen,
      () => {
        const current = historical();
        requireRebind(
          canonicalJsonDigest(contextBinding(current)) === canonicalJsonDigest(frozen.context),
          'recovery historical context changed',
        );
      },
      input.request === undefined ? 'reserve' : 'resume',
    );
    let closed = false;
    const live = () => requireRebind(!closed, 'recovery route is closed');
    return Object.freeze({
      request: structuredClone(frozen),
      operation: handle.operation,
      inspect: () => {
        live();
        return store.inspectRecoveryReview(handle);
      },
      begin: () => {
        live();
        return store.beginRecoveryReview(handle);
      },
      complete: (observed) => {
        live();
        return store.completeRecoveryReview(handle, observed);
      },
      close: () => {
        if (!closed) {
          closed = true;
          db.close();
        }
      },
    });
  } catch (error) {
    db.close();
    throw error;
  }
}

function database(root, config, readonly) {
  const access = requireSafeRepositoryAccess(root);
  const relative = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireRebind(access.fileExists(relative, 'existing host database'), 'existing host database required');
  const file = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'unsafe host database');
  return new Database(file, { readonly, strict: true });
}

function checkedRows(db, table, workspace) {
  const read = () => {
    const present = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!present) return [];
    const oversized = db
      .query(
        `SELECT 1 AS oversized FROM ${table} WHERE workspace_id=? AND length(CAST(payload AS BLOB))>? LIMIT 1`,
      )
      .get(workspace, MAX_CANONICAL_BYTES);
    requireRebind(!oversized, `${table} row payload exceeds canonical byte budget`);
    const rows = db
      .query(`SELECT *, CAST(payload AS BLOB) AS raw_payload_bytes FROM ${table} WHERE workspace_id=? ORDER BY payload`)
      .all(workspace);
    return rows.map((row) => {
      const { raw_payload_bytes: payloadBytes, ...columns } = row;
      requireRebind(
        (Buffer.isBuffer(payloadBytes) || payloadBytes instanceof Uint8Array) &&
          payloadBytes.byteLength <= MAX_CANONICAL_BYTES,
        `${table} row payload bytes are invalid or exceed canonical byte budget`,
      );
      let payload;
      try {
        payload = new TextDecoder('utf-8', { fatal: true }).decode(payloadBytes);
      } catch {
        requireRebind(false, `${table} row payload UTF-8 is invalid`);
      }
      requireRebind(
        typeof row.payload === 'string' &&
          row.payload === payload &&
          Buffer.from(payload, 'utf8').equals(Buffer.from(payloadBytes)),
        `${table} row payload bytes differ from text`,
      );
      const value = JSON.parse(payload);
      const integrityValue =
        table === 'agent_host_governance'
          ? {
              workspace_id: row.workspace_id,
              store_id: row.store_id,
              kind: row.kind,
              record_key: row.record_key,
              revision: row.revision,
              payload: value,
            }
          : value;
      requireRebind(
        row.digest === canonicalJsonDigest(integrityValue) && Number.isSafeInteger(row.revision) && row.revision > 0,
        `${table} row integrity differs`,
      );
      return { ...columns, payloadBytes, value };
    });
  };
  return db.inTransaction ? read() : db.transaction(read).deferred();
}

function checkedRowBindings(rows) {
  return rows.map(({ payload, payloadBytes, value: _value, ...metadata }) => ({
    ...metadata,
    payload_sha256: sha(payloadBytes),
  }));
}

/** Issued indexes follow risk filtering; absent original risk selection requires all possible profiles to be readonly. */
export function cooperativeReadonlyAssignments(config, request) {
  const stage = config.workflows[request.workflow_id]?.stages.find((entry) => entry.id === request.stage_id);
  if (!stage || !Number.isSafeInteger(request.assignment_index) || request.assignment_index < 0) return false;
  const candidates = stage.assignments.filter(
    (assignment, rawIndex) =>
      assignment.role === request.role &&
      rawIndex >= request.assignment_index &&
      stage.assignments.slice(0, rawIndex).filter((prior) => prior.risk_flags === undefined).length <=
        request.assignment_index,
  );
  return (
    candidates.length > 0 &&
    candidates.every((assignment) => {
      const profile = config.agents.profiles[assignment.profile],
        tools = config.agents.tool_policies[profile?.tools_policy];
      return (
        profile?.mutation_scope === 'none' &&
        tools?.source_write === false &&
        Array.isArray(tools.allowed_tools) &&
        tools.allowed_tools.every((tool) =>
          ['runtime.read', 'source.read', 'docs.read', 'web.search'].includes(tool),
        ) &&
        ['none', 'official_docs'].includes(profile.egress_policy)
      );
    })
  );
}

/** Preserve original unknown research; classify only from its own frozen authority. */
function readonlyUnknown(root, config, row, item, host) {
  const state = row.value,
    request = parseSessionBridgeRequest(item.request);
  requireRebind(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === row.workspace_id &&
      state.work_id === row.work_id &&
      state.attempt === row.attempt &&
      Number.isSafeInteger(state.attempt) &&
      state.attempt > 0 &&
      request.run_id === state.run_id &&
      item.host_reservation === undefined &&
      item.research_activation === undefined &&
      item.research_normalization === undefined,
    'issued native outcome is pending/unknown: original journal authority invalid',
  );
  return readonlyUnknownFrozenEngine(root, config, row, item, host);
}

/** Read the original suspended engine state after a caller has proved its Journal authority. */
function readonlyUnknownFrozenEngine(root, config, row, item, host) {
  const state = row.value,
    request = parseSessionBridgeRequest(item.request);
  requireRebind(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === row.workspace_id &&
      state.work_id === row.work_id &&
      state.attempt === row.attempt &&
      Number.isSafeInteger(state.attempt) &&
      state.attempt > 0 &&
      request.run_id === state.run_id,
    'issued native outcome is pending/unknown: original journal authority invalid',
  );
  requireRebind(
    state.source_scope?.schema === 'ScopedSourceSnapshot/v1' &&
      request.scope_digest === state.source_scope.digest &&
      state.source_scope.digest ===
        canonicalJsonDigest({ schema: state.source_scope.schema, entries: state.source_scope.entries }),
    'original source scope differs',
  );
  const owner = host.filter(
    (entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id,
  );
  requireRebind(
    owner.length === 1 &&
      validateReadonlyOwner(owner[0].value) &&
      owner[0].value.workspace_id === state.workspace_id &&
      owner[0].value.binding.repository_id === config.repository.repository_id &&
      owner[0].value.lease === null &&
      owner[0].value.execution.status === 'suspended',
    'readonly issue lacks quiescent suspended owner',
  );
  // The frozen baseline is inspection evidence. Obtain the identity context
  // through the real current loader, after proving its identity/integration
  // domain is unchanged; execution rights still come from the frozen baseline.
  const currentConfig = loadRuntimeConfig(root);
  requireRebind(
    ['repository', 'projects', 'integrations'].every(
      (key) => canonicalJsonDigest(currentConfig[key]) === canonicalJsonDigest(config[key]),
    ),
    'original project integration authority differs',
  );
  const project = loadProjectSetContext(
    root,
    currentConfig,
    config.repository.repository_id,
    owner[0].value.binding.project_ids,
  );
  requireRebind(
    canonicalJsonDigest(project.project_ids) === canonicalJsonDigest(owner[0].value.binding.project_ids) &&
      owner[0].value.binding.integrations_digest === project.integrations_digest,
    'readonly owner project integration binding differs',
  );
  const file = sessionBridgeDatabasePath(root, config),
    access = requireSafeRepositoryAccess(root);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'original workflow database');
  const original = new Database(file, { readonly: true, strict: true });
  try {
    const rows = original
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(state.run_id);
    requireRebind(
      rows.length === 1,
      'issued native outcome is pending/unknown: original snapshot missing or ambiguous',
    );
    const record = rows[0],
      snapshot = JSON.parse(record.snapshot),
      input = snapshot.context?.input;
    requireRebind(
      snapshot.runId === state.run_id &&
        snapshot.status === 'suspended' &&
        input?.work_id === state.work_id &&
        input.attempt === state.attempt &&
        input.workflow_id === request.workflow_id &&
        record.workflow_name === request.workflow_id &&
        input.scope_digest === request.scope_digest &&
        input.config_digest === runtimeConfigDigest(config) &&
        request.config_digest === input.config_digest &&
        sessionBridgeRunId(
          state.workspace_id,
          { work_id: state.work_id, attempt: state.attempt, scope_digest: input.scope_digest },
          request.workflow_id,
        ) === state.run_id,
      'issued native outcome is pending/unknown: frozen config/run authority differs',
    );
    const wave = snapshot.context?.[`wave-${request.wave_index}`];
    requireRebind(
      wave?.payload?.config_digest === input.config_digest &&
        wave.payload.work_id === state.work_id &&
        wave.payload.attempt === state.attempt &&
        wave.payload.scope_digest === request.scope_digest &&
        wave.payload.workflow_id === request.workflow_id &&
        wave.suspendPayload?.requests?.filter((entry) => entry.action_id === request.action_id).length === 1 &&
        canonicalJsonDigest(wave.suspendPayload.requests.find((entry) => entry.action_id === request.action_id)) ===
          canonicalJsonDigest(request),
      'issued native outcome is pending/unknown: suspended request differs',
    );
    const context = { work_id: state.work_id, attempt: state.attempt, scope_digest: input.scope_digest };
    // Frozen baseline is inspection evidence, never a newly authorized execution config.
    requireRebind(
      request.action_id ===
        canonicalJsonDigest({
          context,
          workflow_id: request.workflow_id,
          wave_index: request.wave_index,
          stage_id: request.stage_id,
          assignment_index: request.assignment_index,
        }),
      'original action identity differs',
    );
    requireRebind(
      cooperativeReadonlyAssignments(config, request),
      'issued native outcome is pending/unknown: capability is not cooperative readonly',
    );
    return { run_id: state.run_id, snapshot: record.snapshot };
  } finally {
    original.close();
  }
}

function readonlyBookkeepingUnknown(root, config, row, item, host, store) {
  if (!item.research_activation) return null;
  const state = row.value,
    ownerRows = host.filter(
      (entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id,
    ),
    ledgerRows = host.filter((entry) => entry.kind === 'ledger');
  requireRebind(
    item.issue_id !== null &&
      item.observation === null &&
      !item.host_reservation &&
      !item.research_normalization &&
      ownerRows.length === 1 &&
      ledgerRows.length === 1 &&
      validateReadonlyOwner(ownerRows[0].value) &&
      ownerRows[0].workspace_id === row.workspace_id &&
      ownerRows[0].value.lease === null &&
      ownerRows[0].value.execution.status === 'suspended',
    'readonly bookkeeping UNKNOWN owner or Journal differs',
  );
  const ownerEntry = ownerRows[0],
    ledgerEntry = ledgerRows[0],
    owner = ownerEntry.value,
    identity = {
      repository_id: owner.binding.repository_id,
      project_ids: owner.binding.project_ids,
      integrations_digest: owner.binding.integrations_digest,
      work_id: state.work_id,
    };
  requireRebind(
    HostStateStore.isHostStateStore(store) &&
      store.workspaceId === row.workspace_id,
    'readonly bookkeeping inspector Host workspace differs',
  );
  const snapshot = store.readHostStateSnapshot(identity);
  requireRebind(
    snapshot.work &&
      snapshot.ledger &&
      canonicalJsonDigest(snapshot.work) === canonicalJsonDigest(owner) &&
      canonicalJsonDigest(snapshot.workVersion) ===
        canonicalJsonDigest({ revision: ownerEntry.revision, digest: ownerEntry.digest }) &&
      canonicalJsonDigest(snapshot.ledgerVersion) ===
        canonicalJsonDigest({ revision: ledgerEntry.revision, digest: ledgerEntry.digest }),
    'readonly bookkeeping current Host snapshot differs',
  );
  const intake = readAdmittedSessionIntake(root, store, identity),
    nativeSessionHandle = intake.native_session_handle,
    requestIntents = ['next_work', 'linked_correction'],
    currentReleaseCandidates = snapshot.ledger.operations.flatMap((operation) => {
      if (
        operation.kind !== 'release' ||
        operation.work_id !== state.work_id ||
        operation.thread_id !== nativeSessionHandle ||
        operation.decided_by !== nativeSessionHandle ||
        typeof operation.operation_id !== 'string' ||
        typeof operation.decision_pointer !== 'string' ||
        operation.decision_pointer.length === 0 ||
        operation.decision_pointer.length > 2048 ||
        /\p{Cc}/u.test(operation.decision_pointer)
      )
        return [];
      const matchingIntents = requestIntents.filter(
        (requestIntent) =>
          operation.operation_id ===
          'readonly-bookkeeping-release-' +
            canonicalJsonDigest({
              work_id: state.work_id,
              nativeSessionHandle,
              userRequestPointer: operation.decision_pointer,
              requestIntent,
              journal: row.digest,
            }).slice(0, 40),
      );
      return matchingIntents.length > 0 ? [{ operation, matchingIntents }] : [];
    });
  requireRebind(
    currentReleaseCandidates.length === 1,
    'readonly bookkeeping original current release operation is missing or ambiguous',
  );
  const [{ operation: release, matchingIntents }] = currentReleaseCandidates;
  requireRebind(matchingIntents.length === 1, 'readonly bookkeeping original release intent is ambiguous');
  const releaseKeys = [
      'schema',
      'operation_id',
      'kind',
      'ticket_id',
      'work_id',
      'thread_id',
      'source_revision',
      'resources',
      'from_ledger_revision',
      'to_ledger_revision',
      'decided_by',
      'decision_pointer',
      'created_at',
    ],
    validPointer =
      typeof release.decision_pointer === 'string' &&
      release.decision_pointer.length > 0 &&
      release.decision_pointer.length <= 2048 &&
      !/\p{Cc}/u.test(release.decision_pointer);
  requireRebind(
    hasExactKeys(release, releaseKeys) &&
      release.schema === 'CoordinationOperation/v1' &&
      release.kind === 'release' &&
      typeof release.operation_id === 'string' &&
      release.source_revision === owner.binding.work_source_revision &&
      release.thread_id === nativeSessionHandle &&
      release.decided_by === nativeSessionHandle &&
      validPointer &&
      Number.isSafeInteger(release.from_ledger_revision) &&
      release.from_ledger_revision > 0 &&
      release.to_ledger_revision === release.from_ledger_revision + 1 &&
      snapshot.ledgerVersion.revision >= release.to_ledger_revision &&
      Array.isArray(release.resources) &&
      release.resources.length > 0 &&
      Number.isFinite(Date.parse(release.created_at)),
    'readonly bookkeeping original release operation differs',
  );
  const ticketRows = snapshot.ledger.tickets.filter((ticket) => ticket.ticket_id === release.ticket_id),
    claimRows = snapshot.ledger.claims.filter((claim) => claim.ticket_id === release.ticket_id);
  requireRebind(
    ticketRows.length === 1 && claimRows.length === 1,
    'readonly bookkeeping original released ticket or claim is missing or ambiguous',
  );
  const ticket = ticketRows[0],
    claim = claimRows[0],
    activationBinding = item.research_activation.plan?.binding,
    resources = [...(ticket.exclusive_resources ?? [])].sort();
  requireRebind(
    activationBinding &&
      ticket.status === 'released' &&
      release.ticket_id === activationBinding.lease_ticket_id &&
      ticket.work_id === state.work_id &&
      ticket.thread_id === nativeSessionHandle &&
      ticket.source_revision === owner.binding.work_source_revision &&
      ticket.repository_id === identity.repository_id &&
      canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      ticket.integrations_digest === identity.integrations_digest &&
      ticket.generation === activationBinding.lease_generation &&
      ticket.expires_at === null &&
      ticket.active_resources.length === 0 &&
      ticket.blocked_resources.length === 0 &&
      ticket.claim_ids.length === 1 &&
      ticket.claim_ids[0] === claim.claim_id &&
      claim.status === 'released' &&
      claim.work_id === state.work_id &&
      claim.thread_id === nativeSessionHandle &&
      claim.generation === ticket.generation &&
      typeof claim.lease_expires_at === 'string' &&
      Number.isFinite(Date.parse(claim.lease_expires_at)) &&
      canonicalJsonDigest([...claim.resources].sort()) === canonicalJsonDigest(resources) &&
      canonicalJsonDigest([...release.resources].sort()) === canonicalJsonDigest(resources),
    'readonly bookkeeping exact released ticket or claim differs from activation',
  );
  const inspections = [];
  for (const requestIntent of requestIntents) {
    try {
      const inspected = inspectHistoricalOwnerWork({
        store,
        identity,
        journal: {
          state,
          version: { revision: row.revision, digest: row.digest },
          resume_status: 'issued_outcome_uncertain',
        },
        expectedWork: snapshot.workVersion,
        expectedLedger: snapshot.ledgerVersion,
        expectedMaintenanceGeneration: snapshot.maintenanceGeneration,
        nativeSessionHandle,
        userRequestPointer: release.decision_pointer,
        requestIntent,
        config,
        predicate: 'readonly_bookkeeping',
        documentationContext: {
          repository_root: root,
          repository_id: identity.repository_id,
          project_id: identity.project_ids[0],
          work_id: identity.work_id,
        },
      });
      if (
        canonicalJsonDigest(inspected.workVersion) === canonicalJsonDigest(snapshot.workVersion) &&
        canonicalJsonDigest(inspected.ledgerVersion) === canonicalJsonDigest(snapshot.ledgerVersion)
      )
        inspections.push(requestIntent);
    } catch {
      // A failed bounded predicate inspection is not evidence for either intent.
    }
  }
  requireRebind(
    inspections.length === 1 && inspections[0] === matchingIntents[0],
    'readonly bookkeeping predicate inspection did not uniquely validate the retained release',
  );
  const overlapping = snapshot.ledger.tickets.filter(
    (other) =>
      other.ticket_id !== ticket.ticket_id &&
      ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(other.status) &&
      other.exclusive_resources.some((resource) => resources.includes(resource)),
  );
  requireRebind(overlapping.length === 0, 'readonly bookkeeping scope has a current overlapping owner');
  const engine = readonlyUnknownFrozenEngine(root, config, row, item, host);
  return {
    ...engine,
    outcome: 'UNKNOWN',
    custody_binding: canonicalJsonDigest({
      journal: { revision: row.revision, digest: row.digest },
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      activation: item.research_activation,
      release,
      ticket,
      claim,
      request_intent: inspections[0],
    }),
  };
}

function storedBase64(value, label, maximumBytes) {
  requireRebind(typeof value === 'string' && value.length > 0 && value.length <= Math.ceil(maximumBytes * 4 / 3) + 4, `${label} base64 invalid`);
  const bytes = Buffer.from(value, 'base64');
  requireRebind(bytes.length <= maximumBytes && bytes.toString('base64') === value, `${label} base64 invalid`);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    requireRebind(false, `${label} is not valid UTF-8`);
  }
  requireRebind(Buffer.from(text, 'utf8').equals(bytes), `${label} UTF-8 bytes are not canonical`);
  try {
    return { bytes, value: JSON.parse(text) };
  } catch {
    requireRebind(false, `${label} is not JSON`);
  }
}

/** Read an immutable terminal synthesis custody receipt without accepting its result. */
function readonlyKnownTerminal(db, root, config, row, item, host, store, maintenanceReceipt) {
  const state = row.value,
    receipt = store.readHistoricalTerminalSynthesisCapture(
      { work_id: state.work_id },
      state.attempt,
      item.request.action_id,
    );
  if (!receipt) return null;

  const provenanceKeys = [
      'schema',
      'body_ref',
      'input_ref',
      'report_ref',
      'followup_ref',
      'original_actor_id',
      'denial_status',
      'denial_code',
      'denial_message',
      'denial_reason_gap',
      'input_bytes_base64',
      'report_bytes_base64',
      'predecessor_refs',
    ],
    requestKeys = [
      'schema',
      'identity',
      'attempt',
      'action_id',
      'issue_id',
      'native_session_handle',
      'user_request_pointer',
      'request_intent',
      'expected_work',
      'expected_ledger',
      'expected_journal',
      'expected_maintenance_generation',
      'body_base64',
      'provenance',
    ],
    receiptKeys = [
      'schema',
      'request_digest',
      'request',
      'identity',
      'attempt',
      'action_id',
      'issue_id',
      'terminal_status',
      'task_status',
      'body_base64',
      'body_sha256',
      'body_byte_length',
      'provenance',
      'work_version',
      'ledger_version',
      'journal_version',
      'rights_granted',
      'accepted_result',
      'runtime_acceptance',
    ];
  requireRebind(
    hasExactKeys(receipt, receiptKeys) &&
      hasExactKeys(receipt.request, requestKeys) &&
      hasExactKeys(receipt.provenance, provenanceKeys) &&
      receipt.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
      receipt.terminal_status === 'known_terminal_unaccepted' &&
      receipt.task_status === 'unfinished' &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false &&
      receipt.request_digest === canonicalJsonDigest(receipt.request) &&
      receipt.request.schema === 'HistoricalTerminalSynthesisCapture/v1' &&
      canonicalJsonDigest(receipt.request.provenance) === canonicalJsonDigest(receipt.provenance) &&
      receipt.request.body_base64 === receipt.body_base64 &&
      receipt.identity.work_id === state.work_id &&
      canonicalJsonDigest(receipt.identity) === canonicalJsonDigest(receipt.request.identity) &&
      receipt.attempt === state.attempt &&
      receipt.action_id === item.request.action_id &&
      receipt.issue_id === item.issue_id &&
      item.issue_id !== null &&
      item.observation === null &&
      item.research_activation &&
      !item.research_normalization &&
      !item.host_reservation,
    'known terminal synthesis custody identity or status differs',
  );

  const ownerRows = host.filter(
      (entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id,
    ),
    ledgerRows = host.filter((entry) => entry.kind === 'ledger');
  const expectedMaintenanceGeneration = receipt.request.expected_maintenance_generation,
    currentMaintenanceGeneration = store.readHostStateSnapshot(receipt.identity).maintenanceGeneration,
    heldMaintenanceFence = maintenanceReceipt?.fence,
    verifiedUnfencedStatus =
      maintenanceReceipt?.unfenced === true && db.inTransaction
        ? maintenanceReceipt.prior?.status ?? null
        : !db.inTransaction
          ? store.readMaintenanceFence()?.status ?? null
          : 'unverified';
  requireRebind(
    (heldMaintenanceFence
      ? heldMaintenanceFence.status === 'held' &&
        expectedMaintenanceGeneration + 1 === heldMaintenanceFence.generation &&
        heldMaintenanceFence.generation === currentMaintenanceGeneration
      : verifiedUnfencedStatus !== 'held' &&
        verifiedUnfencedStatus !== 'unverified' &&
        expectedMaintenanceGeneration === currentMaintenanceGeneration) &&
    ownerRows.length === 1 && ledgerRows.length === 1 &&
      validateReadonlyOwner(ownerRows[0].value) &&
      ownerRows[0].workspace_id === state.workspace_id &&
      ownerRows[0].value.binding.repository_id === receipt.identity.repository_id &&
      canonicalJsonDigest(ownerRows[0].value.binding.project_ids) === canonicalJsonDigest(receipt.identity.project_ids) &&
      ownerRows[0].value.binding.integrations_digest === receipt.identity.integrations_digest &&
      ownerRows[0].value.lease === null &&
      ownerRows[0].value.execution.status === 'suspended' &&
      ownerRows[0].value.lifecycle.next_action ===
        'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.' &&
      !ownerRows[0].value.artifacts.some((artifact) => artifact.schema === 'ResearchSynthesis/v1') &&
      receipt.request.expected_work.revision + 1 === ownerRows[0].revision &&
      receipt.request.expected_ledger.revision + 1 === ledgerRows[0].revision &&
      receipt.work_version.revision === ownerRows[0].revision &&
      receipt.work_version.digest === ownerRows[0].digest &&
      receipt.ledger_version.revision === ledgerRows[0].revision &&
      receipt.ledger_version.digest === ledgerRows[0].digest &&
      receipt.journal_version.revision === row.revision &&
      receipt.journal_version.digest === row.digest &&
      receipt.request.expected_journal.revision === row.revision &&
      receipt.request.expected_journal.digest === row.digest,
    'known terminal synthesis Host versions, owner or maintenance binding differs',
  );

  const owner = ownerRows[0].value,
    synthesisStage = config.workflows[item.request.workflow_id]?.stages.find(
      (stage) => stage.id === item.request.stage_id,
    );
  requireRebind(
    item.request.workflow_id === owner.binding.workflow_id &&
      item.request.stage_id === 'synthesize_task' &&
      synthesisStage?.kind === 'synthesize' &&
      synthesisStage.produces.includes('ResearchSynthesis/v1') &&
      synthesisStage.assignments[item.request.assignment_index]?.role === 'research-synthesizer' &&
      cooperativeReadonlyAssignments(config, item.request),
    'known terminal synthesis original stage or configured readonly role differs',
  );

  const ledger = ledgerRows[0].value,
    request = receipt.request,
    releaseOperations = ledger.operations.filter(
      (operation) =>
        operation.kind === 'release' &&
        operation.work_id === state.work_id &&
        operation.thread_id === request.native_session_handle &&
        operation.decided_by === request.native_session_handle &&
        operation.decision_pointer === request.user_request_pointer &&
        operation.from_ledger_revision === request.expected_ledger.revision &&
        operation.to_ledger_revision === receipt.ledger_version.revision,
    );
  requireRebind(releaseOperations.length === 1, 'known terminal synthesis release operation differs');
  const release = releaseOperations[0],
    tickets = ledger.tickets.filter((entry) => entry.ticket_id === release.ticket_id),
    claims = ledger.claims.filter((entry) => entry.ticket_id === release.ticket_id);
  requireRebind(
    tickets.length === 1 &&
      tickets[0].status === 'released' &&
      tickets[0].work_id === state.work_id &&
      tickets[0].thread_id === request.native_session_handle &&
      tickets[0].source_revision === ownerRows[0].value.binding.work_source_revision &&
      tickets[0].generation > 0 &&
      tickets[0].expires_at === null &&
      tickets[0].active_resources.length === 0 &&
      tickets[0].blocked_resources.length === 0 &&
      claims.length > 0 &&
      claims.every(
        (claim) =>
          claim.status === 'released' &&
          claim.work_id === state.work_id &&
          claim.thread_id === request.native_session_handle &&
          claim.generation === tickets[0].generation,
      ) &&
      canonicalJsonDigest([...release.resources].sort()) ===
        canonicalJsonDigest([...tickets[0].exclusive_resources].sort()),
    'known terminal synthesis original owner claim is not released exactly',
  );

  const bodyBytes = Buffer.from(receipt.body_base64, 'base64');
  requireRebind(
    receipt.body_base64.length > 0 &&
      bodyBytes.toString('base64') === receipt.body_base64 &&
      bodyBytes.length === receipt.body_byte_length &&
      sha(bodyBytes) === receipt.body_sha256,
    'known terminal synthesis body custody digest differs',
  );
  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes));
  } catch {
    requireRebind(false, 'known terminal synthesis body custody is not valid JSON');
  }
  const provenance = receipt.provenance,
    input = storedBase64(provenance.input_bytes_base64, 'synthesis input', 65536).value,
    report = storedBase64(provenance.report_bytes_base64, 'synthesis report', 262144).value,
    summary = typeof body.summary === 'string' ? JSON.parse(body.summary) : null;
  requireRebind(
    provenance.schema === 'HistoricalTerminalSynthesisProvenance/v1' &&
      [provenance.body_ref, provenance.input_ref, provenance.report_ref].every(
        (value) =>
          typeof value === 'string' &&
          value.length > 0 &&
          value.length <= 2048 &&
          !value.includes('\\') &&
          !value.startsWith('/') &&
          !/^[A-Za-z]:/.test(value) &&
          !/\p{Cc}/u.test(value) &&
          value.split('/').every((part) => part && part !== '.' && part !== '..'),
      ) &&
      typeof provenance.followup_ref === 'string' &&
      provenance.followup_ref.length > 0 &&
      provenance.followup_ref.length <= 2048 &&
      !/\p{Cc}/u.test(provenance.followup_ref) &&
      provenance.denial_status === 'blocked' &&
      provenance.denial_code === 'GAP-VIDA-RUN-EXECUTION-001' &&
      provenance.denial_reason_gap === 'GAP-VIDA-RUN-EXECUTION-001' &&
      typeof provenance.denial_message === 'string' &&
      provenance.denial_message.length > 0 &&
      provenance.denial_message.length <= 2048 &&
      typeof provenance.original_actor_id === 'string' &&
      provenance.original_actor_id === body.agent_id &&
      body.schema === 'VidaSessionObservation/v1' &&
      body.status === 'reported_complete' &&
      body.action_id === item.request.action_id &&
      body.issue_id === item.issue_id &&
      body.tool_call_ref === provenance.followup_ref &&
      body.output_digest === canonicalJsonDigest(body.summary) &&
      input.status === body.status &&
      input.agent_id === body.agent_id &&
      input.tool_call_ref === body.tool_call_ref &&
      report.exit_code === 1 &&
      typeof report.input_path === 'string' &&
      path.resolve(root, provenance.input_ref) === report.input_path &&
      Array.isArray(report.command) &&
      typeof report.stderr === 'string' &&
      summary?.schema === 'VidaSynthesisObservationOutput/v1' &&
      summary.readiness === 'blocked' &&
      summary.completeness?.status === 'blocked' &&
      (Array.isArray(summary.material_gaps) || Array.isArray(summary.completeness?.material_gaps)) &&
      Array.isArray(provenance.predecessor_refs) &&
      provenance.predecessor_refs.length === 2 &&
      new Set(provenance.predecessor_refs.map((ref) => ref.result_id)).size === 2 &&
      provenance.predecessor_refs.every(
        (ref) =>
          hasExactKeys(ref, ['result_id', 'digest']) &&
          typeof ref.result_id === 'string' &&
          ref.result_id.length > 0 &&
          /^[a-f0-9]{64}$/.test(ref.digest),
      ),
    'known terminal synthesis denial or provenance differs',
  );
  const predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: root,
      config,
      journal: {
        state,
        version: { revision: row.revision, digest: row.digest },
        resume_status: 'issued_outcome_uncertain',
      },
      work: owner,
      workflowId: item.request.workflow_id,
    }),
    predecessorRefs = predecessors
      .map((result) => ({ result_id: result.result_id, digest: result.digest }))
      .sort((left, right) => left.result_id.localeCompare(right.result_id));
  requireRebind(
    predecessors.length === 2 &&
      canonicalJsonDigest(provenance.predecessor_refs) === canonicalJsonDigest(predecessorRefs),
    'known terminal synthesis predecessor references differ from admitted Journal results',
  );
  let denial;
  try {
    denial = JSON.parse(report.stderr);
  } catch {
    requireRebind(false, 'known terminal synthesis denial is not JSON');
  }
  requireRebind(
    denial.schema === 'VidaAgentRunResult/v1' &&
      denial.status === provenance.denial_status &&
      denial.code === provenance.denial_code &&
      denial.message === provenance.denial_message,
    'known terminal synthesis denial provenance differs',
  );

  // Reuse the existing readonly frozen-engine verifier with only the pre-capture
  // research activation fields projected away; no journal bytes are rewritten.
  const engine = readonlyUnknown(
      root,
      config,
      row,
      { ...item, research_activation: undefined, research_normalization: undefined, host_reservation: undefined },
      host,
    );
  return {
    ...engine,
    terminal_status: 'known_terminal_unaccepted',
    custody_binding: canonicalJsonDigest(receipt),
  };
}

export function currentState(db, workspace, root, config, existingStore, maintenanceReceipt) {
  const hostRows = checkedRows(db, 'agent_host_state', workspace);
  for (const row of hostRows) {
    if (row.kind === 'work')
      requireRebind(
        row.value.lease === null &&
          Array.isArray(row.value.execution?.assignment_attempts) &&
          row.value.execution.assignment_attempts.every((item) => !['started', 'uncertain'].includes(item.status)),
        'active/uncertain work blocks rebind',
      );
    if (row.kind === 'ledger')
      requireRebind(
        Array.isArray(row.value.tickets) &&
          Array.isArray(row.value.claims) &&
          row.value.tickets.every((item) => !['queued', 'active'].includes(item.status)) &&
          row.value.claims.every((item) => item.status !== 'active'),
        'queued/active ownership blocks rebind',
      );
  }
  const mastraRows = checkedRows(db, 'agent_host_mastra_session_ledger', workspace);
  const frozen = [];
  let terminalReceiptStore = existingStore;
  for (const row of mastraRows) {
    requireRebind(Array.isArray(row.value.items), 'issued native outcome is pending/unknown');
    for (const item of row.value.items)
      if (item.issue_id !== null && item.observation === null) {
        try {
          terminalReceiptStore ??= new HostStateStore(db, workspace);
          requireRebind(
            HostStateStore.isHostStateStore(terminalReceiptStore) && terminalReceiptStore.workspaceId === workspace,
            'terminal synthesis reader Host workspace differs',
          );
          const recognized =
            readonlyKnownTerminal(db, root, config, row, item, hostRows, terminalReceiptStore, maintenanceReceipt) ??
            readonlyBookkeepingUnknown(root, config, row, item, hostRows, terminalReceiptStore);
          if (recognized) {
            frozen.push(recognized);
            continue;
          }
          const completed = row.value.completed,
            completedItems = Array.isArray(completed)
              ? completed.flatMap((wave) => (Array.isArray(wave.items) ? wave.items : []))
              : [];
          requireRebind(
            Array.isArray(completed) &&
              completed.every((wave) => Array.isArray(wave.items)) &&
              [...completedItems, ...row.value.items].every(
                (entry) => entry.research_activation === undefined && entry.research_normalization === undefined,
              ),
            'generic readonly UNKNOWN requires activation-free Journal history',
          );
          frozen.push(readonlyUnknown(root, config, row, item, hostRows));
        } catch (error) {
          requireRebind(false, `issued native outcome is pending/unknown: ${error.message}`);
        }
      }
  }
  const governanceRows = checkedRows(db, 'agent_host_governance', workspace);
  requireRebind(
    governanceRows.every((row) => !['reserved', 'commit_unknown'].includes(row.value.status)),
    'governance effect pending/unknown',
  );
  return canonicalJsonDigest({
    host: checkedRowBindings(hostRows),
    mastra: checkedRowBindings(mastraRows),
    governance: checkedRowBindings(governanceRows),
    frozen,
  });
}

function selector(access) {
  const bytes = access.readBytes(selectorPath, 'active selector');
  const value = JSON.parse(bytes.toString('utf8'));
  requireRebind(
    value.schema === 'ActiveRuntimeSelector/v1' &&
      identifier.test(value.generation) &&
      value.bundle_root === 'vida-agent' &&
      value.runtime === 'vida-agent' &&
      value.config_path === configPath &&
      /^[a-f0-9]{64}$/.test(value.payload_manifest_sha256),
    'selected bundle identity invalid',
  );
  return { bytes, value };
}

function runtimeBinding(access, config) {
  const bundle = config.runtime.bundle;
  const selectedExists = access.fileExists(selectorPath, 'active selector presence');
  if (bundle !== 'packages/agent') {
    requireRebind(selectedExists, 'selector absence is supported only for the Source project');
    const selected = selector(access);
    return { selector_digest: sha(selected.bytes), bundle_digest: selected.value.payload_manifest_sha256 };
  }
  requireRebind(!selectedExists, 'Source configuration rejects an active selector');
  requireRebind(
    bundle === 'packages/agent' &&
      config.projects.some((project) => project.project_id === 'agent' && project.project_root === bundle),
    'selector absence is supported only for the Source project',
  );
  const workspace = JSON.parse(access.readBytes('package.json', 'Source workspace'));
  const manifest = JSON.parse(access.readBytes(bundle + '/package.json', 'Source package'));
  requireRebind(
    workspace.private === true &&
      Array.isArray(workspace.workspaces) &&
      workspace.workspaces.includes(bundle) &&
      manifest.name === 'vida-agent',
    'Source workspace or package identity differs',
  );
  const packageRoot = path.join(access.repository_root, bundle);
  const inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot));
  requireRebind(
    inventory.includes('src/runtime-kernel.ts') && inventory.includes('bin/run.mjs'),
    'Source runtime is incomplete',
  );
  const source = snapshotDeclaredSources(
    access,
    inventory.map((file) => bundle + '/' + file),
  );
  requireRebind(
    source.entries.every((entry) => entry.exists),
    'Source runtime file disappeared',
  );
  const selection = snapshotDeclaredSources(access, [selectorPath, 'package.json']);
  requireRebind(
    selection.entries.find((entry) => entry.path === selectorPath)?.exists === false,
    'Source selector appeared',
  );
  return {
    selector_digest: selection.digest,
    bundle_digest: source.digest,
  };
}

function frozenPlan(values, root, config, access, db) {
  const delivery = values['--kind'] === 'runtime-config-delivery';
  const baselinePath = delivery ? values['--baseline-config'] : configPath;
  const baselineBytes = access.readBytes(baselinePath, 'local accepted baseline YAML');
  const receipt = readReceipt(access, config);
  if (delivery) {
    sameIdentity(root, config, receipt.value);
    config = validateRuntimeConfigRepairTargetBytes(baselineBytes, root);
    requireRebind(values['--target-config'] === configPath, 'delivery target must be the current root YAML');
  }
  const projects = sameIdentity(root, config, receipt.value);
  requireRebind(
    receipt.value.config_digest === runtimeConfigDigest(config),
    'plan requires unchanged baseline YAML and receipt',
  );
  const binding = runtimeBinding(access, config);
  const target = targetConfig(access, root, config, values['--target-config']);
  const schema = runtimePackageAccess().readBytes(
    'schemas/runtime-initialization.v1.schema.json',
    'initialization schema',
  );
  requireRebind(receipt.value.schema_sha256 === sha(schema), 'baseline initialization schema differs');
  const plan = {
    operation_id: values['--repair-id'],
    actor: values['--actor'],
    instruction_ref: values['--instruction-ref'],
    created_at: values['--timestamp'],
    repository_root: root,
    repository_id: config.repository.repository_id,
    project_ids: projects,
    workspace_id: receipt.value.workspace_id,
    baseline_yaml: baselineBytes.toString('utf8'),
    target_yaml: target.bytes.toString('utf8'),
    baseline_receipt: receipt.bytes.toString('utf8'),
    old_config_digest: runtimeConfigDigest(config),
    target_config_digest: runtimeConfigDigest(target.config),
    initialization_schema_digest: sha(schema),
    ...binding,
    state_digest: currentState(db, receipt.value.workspace_id, root, config),
    token: randomUUID(),
  };
  const operation = {
    schema: delivery ? 'SourceDeliveryConfigRebindOperation/v1' : 'ConfigRebindOperation/v1',
    revision: 1,
    phase: 'planned',
    maintenance_released: false,
    plan,
    plan_digest: delivery
      ? canonicalJsonDigest({ schema: 'SourceDeliveryConfigRebindOperation/v1', plan })
      : canonicalJsonDigest(plan),
  };
  requireRebind(operationValidator(delivery)(operation), 'operation schema invalid');
  return operation;
}

function readOperation(access, operationPath, id, root, delivery) {
  const bytes = access.readBytes(operationPath, 'config rebind operation');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'operation exceeds bound');
  const value = JSON.parse(bytes.toString('utf8'));
  requireRebind(
    operationValidator(delivery)(value) &&
      value.plan.operation_id === id &&
      value.plan.repository_root === root &&
      value.plan_digest === operationDigest(value),
    'frozen operation invalid or foreign',
  );
  return { bytes, value };
}

function readExternalBytes(file, maximum, label) {
  requireRebind(
    typeof file === 'string' &&
      file.length > 0 &&
      file.length <= 4096 &&
      path.isAbsolute(file) &&
      path.resolve(file) === file &&
      !/[\0\r\n]/.test(file),
    `${label} path invalid`,
  );
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
    fd = openSync(file, flags);
  try {
    const before = fstatSync(fd),
      namedBefore = lstatSync(file);
    requireRebind(
      before.isFile() &&
        namedBefore.isFile() &&
        !namedBefore.isSymbolicLink() &&
        before.nlink === 1 &&
        namedBefore.nlink === 1 &&
        before.dev === namedBefore.dev &&
        before.ino === namedBefore.ino &&
        before.size === namedBefore.size &&
        before.size <= maximum,
      `${label} is not a bounded regular file`,
    );
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      requireRebind(count > 0, `${label} ended during read`);
      offset += count;
    }
    const after = fstatSync(fd),
      namedAfter = lstatSync(file),
      extra = Buffer.alloc(1);
    requireRebind(
      after.isFile() &&
        namedAfter.isFile() &&
        !namedAfter.isSymbolicLink() &&
        after.nlink === 1 &&
        namedAfter.nlink === 1 &&
        before.dev === after.dev &&
        before.ino === after.ino &&
        before.size === after.size &&
        before.mtimeMs === after.mtimeMs &&
        before.ctimeMs === after.ctimeMs &&
        after.dev === namedAfter.dev &&
        after.ino === namedAfter.ino &&
        after.size === namedAfter.size &&
        readSync(fd, extra, 0, 1, bytes.length) === 0,
      `${label} changed during read`,
    );
    return bytes;
  } finally {
    closeSync(fd);
  }
}

function parseExternalJson(file, maximum, label) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readExternalBytes(file, maximum, label)));
  } catch (error) {
    requireRebind(false, `${label} is not bounded UTF-8 JSON: ${error.message}`);
  }
}

function validSourceSnapshot(value) {
  requireRebind(
    hasExactKeys(value, ['schema', 'entries', 'digest']) &&
      value.schema === 'ScopedSourceSnapshot/v1' &&
      Array.isArray(value.entries) &&
      value.entries.length > 0 &&
      value.entries.length <= 512 &&
      /^[a-f0-9]{64}$/.test(value.digest) &&
      value.digest === canonicalJsonDigest({ schema: value.schema, entries: value.entries }),
    'source snapshot shape or digest differs',
  );
  let prior = '';
  for (const entry of value.entries) {
    requireRebind(
      hasExactKeys(entry, ['path', 'exists', 'bytes', 'sha256']) &&
        typeof entry.path === 'string' &&
        entry.path.length > 0 &&
        entry.path.length <= 512 &&
        !entry.path.includes('\\') &&
        !entry.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(entry.path) &&
        !/[\u0000-\u001f]/.test(entry.path) &&
        entry.path.split('/').every((part) => part && part !== '.' && part !== '..') &&
        entry.path > prior &&
        typeof entry.exists === 'boolean' &&
        (entry.exists
          ? Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && entry.bytes <= 8 * 1024 * 1024 &&
            typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256)
          : entry.bytes === null && entry.sha256 === null),
      'source snapshot entry is invalid or unsorted',
    );
    prior = entry.path;
  }
  return value;
}

function sourceBeforeimageSnapshot(value, operationId, operationPath, operationBytes) {
  requireRebind(
    hasExactKeys(value, [
      'purpose',
      'operation_id',
      'operation_ref',
      'operation_bytes_base64',
      'source',
      'beforeimages',
      'recorded_at',
      'effects_issued',
    ]) &&
      value.purpose === 'inactive custody only; not an active repair artifact or admission' &&
      value.operation_id === operationId &&
      value.operation_ref === operationPath &&
      value.effects_issued === false &&
      typeof value.recorded_at === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.recorded_at) &&
      Number.isFinite(Date.parse(value.recorded_at)),
    'retained source custody identity differs',
  );
  requireRebind(
    typeof value.operation_bytes_base64 === 'string' &&
      value.operation_bytes_base64.length <= 2 * 1024 * 1024,
    'retained source custody operation bytes are invalid',
  );
  const originalBytes = Buffer.from(value.operation_bytes_base64, 'base64');
  requireRebind(
      originalBytes.toString('base64') === value.operation_bytes_base64 &&
      originalBytes.equals(operationBytes),
    'retained source custody operation bytes differ',
  );
  const recorded = validSourceSnapshot(value.source);
  requireRebind(
    recorded.entries.every((entry) => entry.exists) &&
      Array.isArray(value.beforeimages) &&
      value.beforeimages.length === recorded.entries.length,
    'retained source custody inventory differs',
  );
  const beforeimages = new Map();
  let total = 0;
  for (let index = 0; index < recorded.entries.length; index += 1) {
    const entry = recorded.entries[index],
      beforeimage = value.beforeimages[index];
    requireRebind(
      hasExactKeys(beforeimage, ['path', 'bytes_base64']) &&
        beforeimage.path === entry.path &&
        typeof beforeimage.bytes_base64 === 'string' &&
        beforeimage.bytes_base64.length <= 12 * 1024 * 1024,
      'retained source beforeimage order or shape differs',
    );
    const bytes = Buffer.from(beforeimage.bytes_base64, 'base64');
    requireRebind(
      bytes.toString('base64') === beforeimage.bytes_base64 &&
        bytes.length === entry.bytes &&
        sha(bytes) === entry.sha256,
      'retained source beforeimage bytes differ',
    );
    total += bytes.length;
    requireRebind(total <= 64 * 1024 * 1024, 'retained source beforeimages exceed the source bound');
    beforeimages.set(entry.path, bytes);
  }
  const recomputed = snapshotDeclaredSources(
    {
      fileExists: (relative) => beforeimages.has(relative),
      readBytes: (relative) => beforeimages.get(relative),
    },
    recorded.entries.map((entry) => entry.path),
  );
  requireRebind(recomputed.digest === recorded.digest, 'retained source snapshot does not match its beforeimages');
  return recomputed;
}

function sourceSnapshotChanges(before, after) {
  const beforeEntries = new Map(before.entries.map((entry) => [entry.path, entry])),
    afterEntries = new Map(after.entries.map((entry) => [entry.path, entry])),
    paths = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort(),
    normalize = (entries) => {
      const projected = paths.map((relative) => entries.get(relative) ?? { path: relative, exists: false, bytes: null, sha256: null }),
        body = { schema: 'ScopedSourceSnapshot/v1', entries: projected };
      return { ...body, digest: canonicalJsonDigest(body) };
    };
  return compareScopedSourceSnapshots(normalize(beforeEntries), normalize(afterEntries));
}

function canonicalChangedPaths(value) {
  requireRebind(Array.isArray(value) && value.length > 0 && value.length <= 64, 'authorized source path set invalid');
  const result = [...value].sort();
  requireRebind(
    result.length === new Set(result).size &&
      result.every(
        (relative) =>
          typeof relative === 'string' &&
          relative.length > 0 &&
          relative.length <= 512 &&
          relative.startsWith('packages/agent/') &&
          !relative.includes('\\') &&
          !relative.startsWith('/') &&
          !/^[A-Za-z]:/.test(relative) &&
          !/[\u0000-\u001f]/.test(relative) &&
          relative.split('/').every((part) => part && part !== '.' && part !== '..'),
      ),
    'authorized source paths must be canonical package paths',
  );
  return result;
}

function currentNativeSelfAttestation() {
  const runtime = standaloneRuntime();
  if (!runtime) return null;
  requireRebind(
    process.versions.bun === '1.4.2' &&
      path.isAbsolute(runtime.root) &&
      path.resolve(runtime.root) === runtime.root &&
      path.isAbsolute(runtime.executable) &&
      path.resolve(runtime.executable) === runtime.executable,
    'native self-attestation runtime identity differs',
  );
  const stat = lstatSync(runtime.executable);
  requireRebind(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size > 0 && stat.size <= 512 * 1024 * 1024,
    'native executable is not a bounded regular file',
  );
  const packageBytes = readFileSync(path.join(runtime.root, 'package.json')),
    packageManifest = JSON.parse(packageBytes.toString('utf8')),
    pin = readFileSync(path.join(runtime.root, '.bun-version'), 'utf8').trim(),
    executableBytes = readFileSync(runtime.executable),
    payloadPrefix = packageManifest.version + '-',
    basename = path.basename(runtime.root),
    payloadId = basename.startsWith(payloadPrefix) ? basename.slice(payloadPrefix.length) : '';
  requireRebind(
    packageManifest.name === 'vida-agent' &&
      stableVersionParts(packageManifest.version) !== null &&
      pin === '1.4.2' &&
      executableBytes.length === stat.size &&
      /^[a-f0-9]{64}$/.test(payloadId),
    'native executable, package, pin or resource payload identity differs',
  );
  return {
    schema: 'VidaAgentNativeSelfAttestation/v1',
    executable_path: runtime.executable,
    executable_bytes: executableBytes.length,
    executable_sha256: sha(executableBytes),
    package_name: packageManifest.name,
    package_version: packageManifest.version,
    package_manifest_sha256: sha(packageBytes),
    bun_version: pin,
    runtime_root: runtime.root,
    resource_payload_id: payloadId,
  };
}

function samePath(left, right) {
  const a = path.resolve(left), b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function requireEffectivePath(executable) {
  const directory = path.dirname(executable),
    entries = String(process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  requireRebind(entries.some((entry) => samePath(entry, directory)), 'installed command directory is absent from effective PATH');
}

function validateSourceCorrectionReport(report, request, access, selfAttestation) {
  requireRebind(validateExternalSourceCorrectionReport(report), 'external source correction report schema invalid');
  const completeReport = { ...report, native_self_attestation: selfAttestation };
  const artifact = {
    schema: 'RuntimeConfigSourceCorrectionRepair/v1',
    status: 'applied',
    revision: 2,
    operation_id: request.operation_id,
    request,
    report: completeReport,
  };
  artifact.digest = canonicalJsonDigest(artifact);
  requireRebind(validateSourceCorrection(artifact), 'source correction report or request schema invalid');
  const manifest = completeReport.build_manifest,
    ci = completeReport.ci_delivery,
    result = ci.result,
    expectedChecks = [{ id: 'native-build', status: 'passed' }],
    target = `bun-${process.platform.replace('win32', 'windows')}-${process.arch}`;
  requireRebind(
      selfAttestation &&
      manifest.version === request.new_source_manifest.version &&
      completeReport.request_id === request.request_id &&
      completeReport.operation_id === request.operation_id &&
      completeReport.publish_operation_id === request.publish_operation_id &&
      completeReport.original_operation_sha256 === request.original_operation.sha256 &&
      completeReport.original_plan_digest === request.original_operation.plan_digest &&
      completeReport.source_snapshot_digest === request.new_source.digest &&
      manifest.version === selfAttestation.package_version &&
      manifest.pin === '1.4.2' &&
      manifest.target === target &&
      manifest.payloadId === selfAttestation.resource_payload_id &&
      manifest.asset.file === `vida-agent-${target}${process.platform === 'win32' ? '.exe' : ''}` &&
      manifest.asset.bytes === selfAttestation.executable_bytes &&
      manifest.asset.sha256 === selfAttestation.executable_sha256 &&
      completeReport.build_manifest_sha256 === sha(Buffer.from(json(manifest))) &&
      ci.profile === 'native-build' &&
      ci.conclusion === 'success' &&
      ci.operation_id === request.publish_operation_id &&
      canonicalJsonDigest(ci.checks) === canonicalJsonDigest(expectedChecks) &&
      canonicalJsonDigest(result.checks) === canonicalJsonDigest(expectedChecks) &&
      ci.request_id === result.request_id &&
      ci.operation_id === result.operation_id &&
      ci.source_binding === result.source_binding &&
      ci.run_id === result.run_id &&
      ci.run_attempt === result.run_attempt &&
      result.run_id !== request.prior_system_update.run_id &&
      ci.artifact_id !== request.prior_system_update.artifact_id &&
      ci.result_sha256 === sha(Buffer.from(json(result))) &&
      result.repository_id === request.repository_id &&
      canonicalJsonDigest(result.project_ids) === canonicalJsonDigest(request.source_project_ids) &&
      result.version === manifest.version &&
      result.operation_id === request.publish_operation_id &&
      result.target === manifest.target &&
      result.manifest_sha256 === completeReport.build_manifest_sha256 &&
      result.payload_id === manifest.payloadId &&
      canonicalJsonDigest(result.asset) === canonicalJsonDigest(manifest.asset),
    'source correction report does not bind the current package-native build and CI result',
  );
  const inputByPath = new Map();
  let totalInputBytes = 0,
    previous = '';
  for (const input of manifest.inputs) {
    requireRebind(
      input.path > previous &&
        !input.path.includes('\\') &&
        !input.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(input.path) &&
        !/[\u0000-\u001f:]/.test(input.path) &&
        input.path.split('/').every((part) => part && part !== '.' && part !== '..') &&
        !input.path.startsWith('node_modules/'),
      'native manifest inputs are not canonical and sorted',
    );
    const fullPath = 'packages/agent/' + input.path;
    requireRebind(access.fileExists(fullPath, 'native manifest source input'), 'native manifest input is absent from current Source');
    const bytes = access.readBytes(fullPath, 'native manifest source input');
    requireRebind(bytes.length === input.bytes && sha(bytes) === input.sha256, 'native manifest input differs from current Source');
    totalInputBytes += bytes.length;
    requireRebind(totalInputBytes <= 256 * 1024 * 1024, 'native manifest inputs exceed the validation bound');
    inputByPath.set(input.path, input);
    previous = input.path;
  }
  for (const entry of request.new_source.entries) {
    requireRebind(entry.exists && entry.path.startsWith('packages/agent/'), 'current runtime Source inventory is incomplete');
    const relative = entry.path.slice('packages/agent/'.length),
      input = inputByPath.get(relative);
    requireRebind(
      input && input.bytes === entry.bytes && input.sha256 === entry.sha256,
      'native manifest omits or changes a current runtime Source input',
    );
  }
  const currentPath = selfAttestation.executable_path;
  requireEffectivePath(currentPath);
  const installation = completeReport.installation_receipt,
    sourcePath = installation.source_path;
  requireRebind(
    typeof sourcePath === 'string' &&
      !sourcePath.includes('\\') &&
      !sourcePath.startsWith('/') &&
      !/^[A-Za-z]:/.test(sourcePath) &&
      sourcePath.split('/').every((part) => part && part !== '.' && part !== '..') &&
      access.fileExists(sourcePath, 'native installation source asset'),
    'installed source asset path is not a current project file',
  );
  const sourceAssetBytes = access.readBytes(sourcePath, 'native installation source asset');
  requireRebind(
    sourceAssetBytes.length === manifest.asset.bytes &&
      sha(sourceAssetBytes) === manifest.asset.sha256 &&
      installation.source_sha256 === manifest.asset.sha256 &&
      installation.prior_bytes === request.prior_system_update.installed_bytes &&
      installation.selected_bytes === selfAttestation.executable_bytes &&
      installation.action === 'update' &&
      installation.exit_code === 0 &&
      installation.signal === null &&
      installation.tests_invoked === false &&
      installation.reinstallation === false &&
      samePath(installation.path, currentPath) &&
      installation.sha256 === selfAttestation.executable_sha256 &&
      samePath(completeReport.effective_path.command_path, currentPath) &&
      completeReport.effective_path.bytes === selfAttestation.executable_bytes &&
      completeReport.effective_path.sha256 === selfAttestation.executable_sha256 &&
      completeReport.effective_path.package_name === selfAttestation.package_name &&
      completeReport.effective_path.version === selfAttestation.package_version &&
      completeReport.effective_path.target === target,
    'installed receipt, command PATH or native executable differs',
  );
  return artifact;
}

function validateSourceCorrectionArtifact(value) {
  requireRebind(validateSourceCorrection(value), 'source correction sidecar schema invalid');
  const { digest, ...body } = value;
  requireRebind(digest === canonicalJsonDigest(body) && value.request.operation_id === value.operation_id, 'source correction sidecar digest or identity differs');
  validSourceSnapshot(value.request.old_source);
  validSourceSnapshot(value.request.new_source);
  const manifestEntry = value.request.new_source.entries.find(
    (entry) => entry.path === value.request.new_source_manifest.path,
  );
  requireRebind(
    value.request.publish_operation_id !== value.request.operation_id &&
      value.request.new_source_manifest.path === 'packages/agent/package.json' &&
      value.request.new_source_manifest.package_name === 'vida-agent' &&
      isCurrentOrLaterStableVersion(value.request.new_source_manifest.version, value.request.prior_system_update.version) &&
      manifestEntry?.exists === true &&
      manifestEntry.bytes === value.request.new_source_manifest.bytes &&
      manifestEntry.sha256 === value.request.new_source_manifest.sha256,
    'Source package release version or publication identity differs from its frozen Source snapshot',
  );
  return value;
}

function parseSourceCorrectionArgs(args) {
  requireRebind(args.length % 2 === 0, 'source correction arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRebind(
      args[index]?.startsWith('--') && args[index + 1] && !Object.hasOwn(values, args[index]),
      'source correction arguments invalid',
    );
    values[args[index]] = args[index + 1];
  }
  const mode = values['--mode'],
    planning = ['repair-inspect', 'repair-plan'].includes(mode),
    base = ['--kind', '--mode', '--project-root', '--repair-id'],
    expected = planning
      ? [...base, '--source-beforeimages', '--authorized-paths', '--prior-system-update',
          ...(Object.hasOwn(values, '--publish-operation') ? ['--publish-operation'] : [])]
      : mode === 'repair-apply'
        ? [...base, '--report']
        : base;
  requireRebind(
    Object.keys(values).sort().join('|') === expected.sort().join('|') &&
      values['--kind'] === 'runtime-config-delivery' &&
      ['repair-inspect', 'repair-plan', 'repair-apply', 'repair-resume', 'repair-transition'].includes(mode) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      identifier.test(values['--repair-id']) &&
      (planning
        ? ['--source-beforeimages', '--prior-system-update'].every(
            (key) => path.isAbsolute(values[key] ?? '') && path.resolve(values[key]) === values[key],
          )
        : mode === 'repair-apply'
          ? path.isAbsolute(values['--report'] ?? '') && path.resolve(values['--report']) === values['--report']
          : true),
    'source correction mode, root, identity or argument set invalid',
  );
  let authorizedPaths;
  if (planning) {
    requireRebind(
      values['--publish-operation'] === undefined || identifier.test(values['--publish-operation']),
      'published operation identity is invalid',
    );
    try {
      authorizedPaths = JSON.parse(values['--authorized-paths']);
    } catch {
      requireRebind(false, 'authorized source path set is not JSON');
    }
    values.authorized_changed_paths = canonicalChangedPaths(authorizedPaths);
    requireRebind(
      path.resolve(values['--source-beforeimages']) === values['--source-beforeimages'] &&
        !/[\0\r\n]/.test(values['--source-beforeimages']) &&
        !/[\0\r\n]/.test(values['--prior-system-update']) &&
        Buffer.byteLength(values['--authorized-paths'], 'utf8') <= 32768,
      'retained source custody or prior update path invalid',
    );
  } else if (mode === 'repair-apply') {
    requireRebind(
      path.resolve(values['--report']) === values['--report'] && !/[\0\r\n]/.test(values['--report']),
      'source correction report path invalid',
    );
  }
  return values;
}

function projectRelativeExternalPath(root, absolutePath, label) {
  requireRebind(
    typeof absolutePath === 'string' &&
      path.isAbsolute(absolutePath) &&
      path.resolve(absolutePath) === absolutePath &&
      !/[\0\r\n]/.test(absolutePath),
    `${label} path invalid`,
  );
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  requireRebind(
    relative.length > 0 &&
      relative !== '..' &&
      !relative.startsWith('../') &&
      !path.isAbsolute(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    `${label} must remain inside the project root`,
  );
  return relative;
}

function sourceBeforeimageBinding({ access, root, beforeimagePath, operationId, operationPath, operationBytes, frozen }) {
  const relative = frozen?.path ?? projectRelativeExternalPath(root, beforeimagePath, 'retained source custody');
  requireRebind(
    typeof relative === 'string' &&
      !relative.includes('\\') &&
      !relative.startsWith('/') &&
      !/^[A-Za-z]:/.test(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    'retained source custody path is not canonical',
  );
  const bytes = frozen
    ? access.readBytes(relative, 'retained source custody')
    : readExternalBytes(beforeimagePath, 96 * 1024 * 1024, 'retained source custody');
  requireRebind(
    bytes.length <= 96 * 1024 * 1024 &&
      (!frozen || (bytes.length === frozen.bytes && sha(bytes) === frozen.sha256)),
    'retained source custody bytes changed',
  );
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'retained source custody is not bounded UTF-8 JSON');
  }
  const snapshot = sourceBeforeimageSnapshot(value, operationId, operationPath, operationBytes),
    binding = {
      schema: 'SourceBeforeimageBinding/v1',
      path: relative,
      bytes: bytes.length,
      sha256: sha(bytes),
      snapshot_digest: snapshot.digest,
    };
  requireRebind(
    !frozen || canonicalJsonDigest(binding) === canonicalJsonDigest(frozen),
    'retained source custody binding differs from the frozen request',
  );
  return { snapshot, binding };
}

function priorSystemUpdateBinding({ access, root, priorSystemUpdatePath, frozen }) {
  const relative = frozen?.path ?? projectRelativeExternalPath(root, priorSystemUpdatePath, 'prior system update receipt');
  requireRebind(
    typeof relative === 'string' &&
      !relative.includes('\\') &&
      !relative.startsWith('/') &&
      !/^[A-Za-z]:/.test(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    'prior system update receipt path is not canonical',
  );
  const bytes = frozen
    ? access.readBytes(relative, 'prior system update receipt')
    : readExternalBytes(priorSystemUpdatePath, 1024 * 1024, 'prior system update receipt');
  requireRebind(
    bytes.length <= 1024 * 1024 &&
      (!frozen || (bytes.length === frozen.bytes && sha(bytes) === frozen.sha256)),
    'prior system update receipt bytes changed',
  );
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'prior system update receipt is not bounded UTF-8 JSON');
  }
  requireRebind(
    value &&
      typeof value.status === 'string' && value.status.length > 0 && value.status.length <= 128 &&
      typeof value.operation_id === 'string' && identifier.test(value.operation_id) &&
      typeof value.version === 'string' && stableVersionParts(value.version) !== null &&
      typeof value.entry === 'string' && path.isAbsolute(value.entry) &&
      typeof value.run_id === 'string' && /^[1-9][0-9]{0,31}$/.test(value.run_id) &&
      typeof value.artifact_id === 'string' && /^[1-9][0-9]{0,31}$/.test(value.artifact_id) &&
      Number.isSafeInteger(value.installed_bytes) && value.installed_bytes > 0 &&
      Number.isSafeInteger(value.prior_bytes) && value.prior_bytes > 0 &&
      Number.isSafeInteger(value.delta_bytes) && value.installed_bytes - value.prior_bytes === value.delta_bytes &&
      typeof value.configuration_inspection === 'string' && value.configuration_inspection.length <= 128 &&
      value.tests_invoked === false && value.reinstallation === false &&
      value.runtime_accepted === false && value.developer_unblocked === false,
    'prior system update receipt is not a bounded, non-acceptance update observation',
  );
  const binding = {
    schema: 'PriorSystemUpdateBinding/v1',
    path: relative,
    bytes: bytes.length,
    sha256: sha(bytes),
    status: value.status,
    operation_id: value.operation_id,
    version: value.version,
    entry: value.entry,
    run_id: value.run_id,
    artifact_id: value.artifact_id,
    installed_bytes: value.installed_bytes,
    prior_bytes: value.prior_bytes,
    delta_bytes: value.delta_bytes,
    configuration_inspection: value.configuration_inspection,
    tests_invoked: value.tests_invoked,
    reinstallation: value.reinstallation,
    runtime_accepted: value.runtime_accepted,
    developer_unblocked: value.developer_unblocked,
  };
  requireRebind(!frozen || canonicalJsonDigest(binding) === canonicalJsonDigest(frozen), 'prior system update binding differs');
  return binding;
}

function sourcePackageManifestBinding({ access, bundle, source, priorVersion }) {
  const relative = `${bundle}/package.json`,
    bytes = access.readBytes(relative, 'current Source package manifest'),
    entry = source.entries.find((candidate) => candidate.path === relative);
  requireRebind(
    bytes.length > 0 &&
      bytes.length <= 1024 * 1024 &&
      entry?.exists === true &&
      entry.bytes === bytes.length &&
      entry.sha256 === sha(bytes),
    'current Source package manifest is not bound by the new Source snapshot',
  );
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'current Source package manifest is not bounded UTF-8 JSON');
  }
  requireRebind(
    manifest?.name === 'vida-agent' &&
      stableVersionParts(manifest.version) !== null &&
      isCurrentOrLaterStableVersion(manifest.version, priorVersion),
    'current Source package version must be a valid release at or after the prior installed version',
  );
  return {
    schema: 'RuntimeConfigSourcePackageBinding/v1',
    path: relative,
    bytes: bytes.length,
    sha256: sha(bytes),
    package_name: manifest.name,
    version: manifest.version,
  };
}

function sourceCorrectionCustody(db, workspace, store) {
  const rows = checkedRows(db, 'agent_host_mastra_session_ledger', workspace),
    custody = [];
  for (const row of rows) {
    requireRebind(Array.isArray(row.value.items), 'source correction Journal items invalid');
    for (const item of row.value.items) {
      if (item.issue_id === null || item.observation !== null) continue;
      const receipt = store.readHistoricalTerminalSynthesisCapture(
        { work_id: row.value.work_id },
        row.value.attempt,
        item.request.action_id,
      );
      if (!receipt) continue;
      custody.push({
        schema: 'KnownTerminalCustodyBinding/v1',
        work_id: row.value.work_id,
        attempt: row.value.attempt,
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        receipt_digest: canonicalJsonDigest(receipt),
        journal_revision: row.revision,
        journal_digest: row.digest,
        expected_maintenance_generation: receipt.request.expected_maintenance_generation,
      });
    }
  }
  custody.sort((left, right) =>
    left.work_id < right.work_id
      ? -1
      : left.work_id > right.work_id
        ? 1
        : left.attempt - right.attempt || left.action_id.localeCompare(right.action_id),
  );
  requireRebind(custody.length > 0, 'known-terminal source correction custody is missing');
  return custody;
}

function sourceCorrectionRequest({
  access,
  root,
  config,
  db,
  id,
  operationPath,
  operationBytes,
  operation,
  beforeimagePath,
  priorSystemUpdatePath,
  authorizedPaths,
  publishOperationId,
  frozenRequest,
  allowForwardReceipt = false,
}) {
  requireRebind(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      operation.revision === 2 &&
      operation.phase === 'fenced' &&
      operation.maintenance_released === false &&
      operation.plan.operation_id === id,
    'source correction requires the original fenced delivery operation',
  );
  const plan = operation.plan,
    baseline = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, baseline, configPath).config,
    baselineReceipt = JSON.parse(plan.baseline_receipt),
    projectIds = sameIdentity(root, baseline, baselineReceipt),
    currentReceipt = readReceipt(access, config),
    currentYamlBytes = access.readBytes(configPath, 'current authored configuration'),
    currentYaml = currentYamlBytes.toString('utf8'),
    yamlState = currentYaml === plan.baseline_yaml ? 'baseline' : currentYaml === plan.target_yaml ? 'target' : null;
  requireRebind(
    baseline.runtime.bundle === 'packages/agent' &&
      target.runtime.bundle === baseline.runtime.bundle &&
      config.repository.repository_id === plan.repository_id &&
      canonicalJsonDigest(projectIds) === canonicalJsonDigest(plan.project_ids) &&
      (yamlState === 'baseline' || yamlState === 'target') &&
      (currentReceipt.bytes.toString('utf8') === plan.baseline_receipt ||
        (allowForwardReceipt &&
          currentReceipt.bytes.toString('utf8') ===
            json({ ...baselineReceipt, config_digest: plan.target_config_digest }))),
    'source correction configuration or receipt differs from the frozen operation',
  );
  const initSchema = runtimePackageAccess().readBytes(
      'schemas/runtime-initialization.v1.schema.json',
      'initialization schema',
    ),
    binding = runtimeBinding(access, baseline),
    sourceInventory = runtimeExecutableInventory(
      path.join(root, baseline.runtime.bundle),
      'source',
      requireSafeRepositoryAccess(path.join(root, baseline.runtime.bundle)),
    ),
    newSource = snapshotDeclaredSources(access, sourceInventory.map((file) => baseline.runtime.bundle + '/' + file)),
    beforeimages = sourceBeforeimageBinding({
      access,
      root,
      beforeimagePath,
      operationId: id,
      operationPath,
      operationBytes,
      frozen: frozenRequest?.source_beforeimages,
    }),
    oldSource = beforeimages.snapshot,
    priorSystemUpdate = priorSystemUpdateBinding({
      access,
      root,
      priorSystemUpdatePath,
      frozen: frozenRequest?.prior_system_update,
    }),
    newSourceManifest = sourcePackageManifestBinding({
      access,
      bundle: baseline.runtime.bundle,
      source: newSource,
      priorVersion: priorSystemUpdate.version,
    }),
    changes = sourceSnapshotChanges(oldSource, newSource),
    scopePaths = frozenRequest?.authorized_changed_paths ?? authorizedPaths,
    sourceProjectIds = config.projects
      .filter((project) => path.resolve(root, project.project_root) === path.resolve(root, baseline.runtime.bundle))
      .map((project) => project.project_id)
      .sort();
  requireRebind(
    sha(initSchema) === plan.initialization_schema_digest &&
      binding.selector_digest === plan.selector_digest &&
      binding.bundle_digest === newSource.digest &&
      oldSource.digest === plan.bundle_digest &&
      changes.length > 0 &&
      changes.every((change) => change.kind !== 'disappeared' && scopePaths.includes(change.path)) &&
      sourceProjectIds.length === 1 &&
      sourceProjectIds[0] === 'agent' &&
      scopePaths.every((relative) => access.fileExists(relative, 'authorized Source path presence')),
    'Source changes, initialization schema or source scope differ from the original operation',
  );
  requireRebind(
    !frozenRequest ||
      canonicalJsonDigest(authorizedPaths ?? scopePaths) === canonicalJsonDigest(scopePaths),
    'authorized Source path set differs from the frozen repair scope',
  );
  const workspaceId = deriveWorkspaceId(plan.repository_id, root),
    readOnlyMaintenanceInspection = {
      principal: 'vida-agent-runtime-config-source-correction',
      projectIds: plan.project_ids,
      verify: async () => null,
    },
    store = new HostStateStore(db, workspaceId, undefined, undefined, undefined, readOnlyMaintenanceInspection, root),
    expectedBinding = fenceBinding(plan, operation.plan_digest),
    fence = store.readMaintenanceFence();
  requireRebind(
    workspaceId === plan.workspace_id &&
      fence?.status === 'held' &&
      fence.workspace_id === workspaceId &&
      canonicalJsonDigest(fence.binding) === canonicalJsonDigest(expectedBinding),
    'source correction requires the original held maintenance fence',
  );
  const maintenanceReceipt = { fence, token: plan.token },
    stateDigest = store.withMaintenanceInspection(maintenanceReceipt, () =>
      currentState(db, workspaceId, root, baseline, store, maintenanceReceipt),
    );
  requireRebind(stateDigest === plan.state_digest, 'source correction Host, Journal or state CAS differs');
  const custody = sourceCorrectionCustody(db, workspaceId, store);
  return {
    schema: 'RuntimeConfigSourceCorrectionRequest/v1',
    request_id: frozenRequest?.request_id ?? randomUUID(),
    operation_id: id,
    publish_operation_id: frozenRequest?.publish_operation_id ?? publishOperationId ?? randomUUID(),
    original_operation: {
      path: operationPath,
      sha256: sha(operationBytes),
      plan_digest: operation.plan_digest,
      revision: operation.revision,
      phase: operation.phase,
      maintenance_released: operation.maintenance_released,
    },
    repository_root: root,
    repository_id: plan.repository_id,
    project_ids: projectIds,
    source_project_ids: sourceProjectIds,
    workspace_id: workspaceId,
    state_digest: stateDigest,
    config: {
      schema: 'RuntimeConfigSourceCorrectionConfig/v1',
      baseline_config_digest: plan.old_config_digest,
      target_config_digest: plan.target_config_digest,
      current_yaml_sha256: sha(currentYamlBytes),
      yaml_state: yamlState,
      receipt_sha256: sha(currentReceipt.bytes),
      baseline_receipt_sha256: sha(Buffer.from(plan.baseline_receipt)),
      initialization_schema_digest: plan.initialization_schema_digest,
    },
    fence: structuredClone(fence),
    custody,
    old_source: oldSource,
    source_beforeimages: beforeimages.binding,
    prior_system_update: priorSystemUpdate,
    new_source: newSource,
    new_source_manifest: newSourceManifest,
    source_changes: changes.map((change) => structuredClone(change)),
    authorized_changed_paths: scopePaths,
  };
}

function sealSourceCorrection(status, operationId, request, report) {
  const artifact = {
    schema: 'RuntimeConfigSourceCorrectionRepair/v1',
    status,
    revision: status === 'requested' ? 1 : 2,
    operation_id: operationId,
    request,
    ...(report ? { report } : {}),
  };
  artifact.digest = canonicalJsonDigest(artifact);
  validateSourceCorrectionArtifact(artifact);
  return artifact;
}

function readSourceCorrectionArtifact(access, relative) {
  const bytes = access.readBytes(relative, 'source correction repair');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'source correction repair exceeds bound');
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    requireRebind(false, 'source correction repair is not valid JSON');
  }
  return { bytes, value: validateSourceCorrectionArtifact(value) };
}

function sourceCorrectionCurrentRequest({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  request,
  allowForwardReceipt = false,
}) {
  const retainedOriginal =
      operation.revision === 2 && operation.phase === 'fenced' && operation.maintenance_released === false
        ? { bytes: operationBytes, value: operation }
        : originalSourceDeliveryOperation({ access, operationPath, operation, request }),
    sourceOperation = retainedOriginal.value,
    sourceOperationBytes = retainedOriginal.bytes,
    plan = sourceOperation.plan;
  requireRebind(
    sourceOperation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      sourceOperation.revision === 2 &&
      sourceOperation.phase === 'fenced' &&
      sourceOperation.maintenance_released === false &&
      request.operation_id === sourceOperation.plan.operation_id &&
      request.original_operation.path === operationPath &&
      request.original_operation.sha256 === sha(sourceOperationBytes) &&
      request.original_operation.plan_digest === sourceOperation.plan_digest &&
      request.original_operation.revision === sourceOperation.revision &&
      request.original_operation.phase === sourceOperation.phase &&
      request.original_operation.maintenance_released === sourceOperation.maintenance_released &&
      request.repository_root === root &&
      request.repository_id === plan.repository_id &&
      canonicalJsonDigest(request.project_ids) === canonicalJsonDigest(plan.project_ids) &&
      request.workspace_id === plan.workspace_id &&
      request.state_digest === plan.state_digest &&
      request.config.baseline_config_digest === plan.old_config_digest &&
      request.config.target_config_digest === plan.target_config_digest &&
      request.config.baseline_receipt_sha256 === sha(Buffer.from(plan.baseline_receipt)) &&
      request.config.receipt_sha256 === request.config.baseline_receipt_sha256 &&
      request.config.current_yaml_sha256 ===
        sha(Buffer.from(request.config.yaml_state === 'baseline' ? plan.baseline_yaml : plan.target_yaml)) &&
      request.config.initialization_schema_digest === plan.initialization_schema_digest &&
      request.old_source.digest === plan.bundle_digest &&
      request.source_beforeimages.snapshot_digest === request.old_source.digest,
    'source correction request does not bind the original frozen delivery operation',
  );
  const current = sourceCorrectionRequest({
      access,
      root,
      config,
      db,
      id: request.operation_id,
      operationPath,
      operationBytes: sourceOperationBytes,
      operation: sourceOperation,
      authorizedPaths: request.authorized_changed_paths,
      frozenRequest: request,
    allowForwardReceipt,
    }),
    stable = (value) => {
      const copy = structuredClone(value);
      delete copy.config.current_yaml_sha256;
      delete copy.config.yaml_state;
      delete copy.config.receipt_sha256;
      return copy;
    };
  requireRebind(
    canonicalJsonDigest(stable(current)) === canonicalJsonDigest(stable(request)) &&
      [
        sha(Buffer.from(plan.baseline_receipt)),
        sha(Buffer.from(json({ ...JSON.parse(plan.baseline_receipt), config_digest: plan.target_config_digest }))),
      ].includes(current.config.receipt_sha256),
    'source correction config, fence, state, custody or Source snapshot drifted',
  );
  return current;
}

function validateSourceCorrectionBridge({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  artifact,
}) {
  validateSourceCorrectionArtifact(artifact);
  requireRebind(artifact.status === 'applied', 'source correction is not applied');
  const request = artifact.request;
  sourceCorrectionCurrentRequest({
    access,
    root,
    config,
    db,
    operationPath,
    operationBytes,
    operation,
    request,
    allowForwardReceipt: true,
  });
  const selfAttestation = currentNativeSelfAttestation();
  requireRebind(selfAttestation, 'source correction resume requires the installed native package');
  const { native_self_attestation: recordedSelf, ...externalReport } = artifact.report,
    validated = validateSourceCorrectionReport(externalReport, request, access, selfAttestation);
  requireRebind(
    canonicalJsonDigest(recordedSelf) === canonicalJsonDigest(selfAttestation) &&
      canonicalJsonDigest(validated.report) === canonicalJsonDigest(artifact.report),
    'source correction installed evidence changed or is not exact',
  );
  return true;
}

function originalSourceDeliveryOperation({ access, operationPath, operation, request }) {
  const beforeimageBytes = access.readBytes(request.source_beforeimages.path, 'retained source custody');
  requireRebind(
    beforeimageBytes.length === request.source_beforeimages.bytes &&
      sha(beforeimageBytes) === request.source_beforeimages.sha256,
    'retained source custody bytes changed after source repair',
  );
  let beforeimage;
  try {
    beforeimage = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(beforeimageBytes));
  } catch {
    requireRebind(false, 'retained source custody is not bounded UTF-8 JSON');
  }
  requireRebind(
    typeof beforeimage.operation_bytes_base64 === 'string',
    'retained source custody omitted original delivery bytes',
  );
  const operationBytes = Buffer.from(beforeimage.operation_bytes_base64, 'base64');
  requireRebind(
    operationBytes.toString('base64') === beforeimage.operation_bytes_base64 &&
      operationBytes.length > 0 &&
      operationBytes.length <= 2 * 1024 * 1024,
    'retained source custody original delivery bytes are invalid',
  );
  const originalSnapshot = sourceBeforeimageSnapshot(
    beforeimage,
    request.operation_id,
    operationPath,
    operationBytes,
  );
  let original;
  try {
    original = JSON.parse(operationBytes.toString('utf8'));
  } catch {
    requireRebind(false, 'retained original delivery operation is not JSON');
  }
  requireRebind(
    operationValidator(true)(original) &&
      original.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      original.revision === 2 &&
      original.phase === 'fenced' &&
      original.maintenance_released === false &&
      original.plan.operation_id === request.operation_id &&
      original.plan.repository_root === request.repository_root &&
      original.plan_digest === operationDigest(original) &&
      sha(operationBytes) === request.original_operation.sha256 &&
      request.original_operation.path === operationPath &&
      request.original_operation.plan_digest === original.plan_digest &&
      request.original_operation.revision === original.revision &&
      request.original_operation.phase === original.phase &&
      request.original_operation.maintenance_released === original.maintenance_released &&
      originalSnapshot.digest === request.old_source.digest &&
      request.source_beforeimages.snapshot_digest === originalSnapshot.digest &&
      operationValidator(true)(operation) &&
      operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      operation.phase === 'applied' &&
      ((operation.revision === 3 && operation.maintenance_released === false) ||
        (operation.revision === 4 && operation.maintenance_released === true)) &&
      operation.plan_digest === original.plan_digest &&
      canonicalJsonDigest(operation.plan) === canonicalJsonDigest(original.plan),
    'source delivery close operation differs from its retained original bytes',
  );
  return { bytes: operationBytes, value: original };
}

/**
 * Read-only consistency proof for the finite delivered-config transition.
 * It deliberately does not compare the frozen pre-delivery Host digest with
 * later owner state; callers must perform their own fresh owner CAS check.
 */
function closedSourceDeliveryTransition({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  artifact,
  store,
}) {
  validateSourceCorrectionArtifact(artifact);
  requireRebind(artifact.status === 'applied', 'source correction is not applied');
  const request = artifact.request,
    original = originalSourceDeliveryOperation({ access, operationPath, operation, request }),
    originalOperation = original.value,
    plan = operation.plan,
    expectedBinding = fenceBinding(plan, operation.plan_digest),
    heldFence = request.fence,
    releasedFence = store.readMaintenanceFence(),
    currentYamlBytes = access.readBytes(configPath, 'current authored YAML'),
    currentConfig = loadRuntimeConfig(root),
    currentReceipt = readReceipt(access, currentConfig),
    baseline = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, baseline, configPath).config,
    nextReceipt = json({ ...JSON.parse(plan.baseline_receipt), config_digest: plan.target_config_digest });
  requireRebind(
    operationBytes.length > 0 &&
      sha(operationBytes) === sha(access.readBytes(operationPath, 'closed delivery operation')) &&
      originalOperation.plan_digest === request.original_operation.plan_digest &&
      request.repository_root === root &&
      request.operation_id === operation.plan.operation_id &&
      request.repository_id === operation.plan.repository_id &&
      request.workspace_id === operation.plan.workspace_id &&
      request.config.target_config_digest === operation.plan.target_config_digest &&
      canonicalJsonDigest(heldFence.binding) === canonicalJsonDigest(expectedBinding) &&
      heldFence.workspace_id === operation.plan.workspace_id &&
      heldFence.status === 'held' &&
      releasedFence?.status === 'released' &&
      releasedFence.workspace_id === operation.plan.workspace_id &&
      canonicalJsonDigest(releasedFence.binding) === canonicalJsonDigest(expectedBinding) &&
      releasedFence.generation === heldFence.generation &&
      releasedFence.token_digest === heldFence.token_digest &&
      request.custody.every(
        (entry) => entry.expected_maintenance_generation + 1 === releasedFence.generation,
      ) &&
      currentYamlBytes.toString('utf8') === plan.target_yaml &&
      runtimeConfigDigest(currentConfig) === plan.target_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      currentReceipt.bytes.toString('utf8') === nextReceipt &&
      sameIdentity(root, target, currentReceipt.value),
    'closed source delivery configuration or released fence differs from its finite transition',
  );
  const currentBinding = runtimeBinding(access, baseline),
    sourceInventory = runtimeExecutableInventory(
      path.join(root, baseline.runtime.bundle),
      'source',
      requireSafeRepositoryAccess(path.join(root, baseline.runtime.bundle)),
    ),
    currentSource = snapshotDeclaredSources(access, sourceInventory.map((file) => baseline.runtime.bundle + '/' + file));
  requireRebind(
    currentBinding.selector_digest === plan.selector_digest &&
      currentBinding.bundle_digest === request.new_source.digest &&
      currentSource.digest === request.new_source.digest,
    'closed source delivery current Source differs from its retained repair snapshot',
  );
  const selfAttestation = currentNativeSelfAttestation();
  requireRebind(selfAttestation, 'closed source delivery proof requires the current installed native package');
  const { native_self_attestation: recordedSelf, ...externalReport } = artifact.report,
    validated = validateSourceCorrectionReport(externalReport, request, access, selfAttestation);
  requireRebind(
    canonicalJsonDigest(recordedSelf) === canonicalJsonDigest(selfAttestation) &&
      canonicalJsonDigest(validated.report) === canonicalJsonDigest(artifact.report),
    'closed source delivery report differs from the current installed native package',
  );
  const completion = {
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_path: operationPath,
    operation_sha256: sha(operationBytes),
    operation_plan_digest: operation.plan_digest,
    request_id: request.request_id,
    request_digest: canonicalJsonDigest(request),
    report_digest: canonicalJsonDigest(artifact.report),
    source_snapshot_digest: currentSource.digest,
    target_config_digest: plan.target_config_digest,
    target_yaml_sha256: sha(currentYamlBytes),
    receipt_path: receiptPath,
    receipt_sha256: sha(currentReceipt.bytes),
    fence: structuredClone(releasedFence),
    native_self_attestation_digest: canonicalJsonDigest(selfAttestation),
    runtime_accepted: false,
  };
  requireRebind(
    !artifact.completion || canonicalJsonDigest(artifact.completion) === canonicalJsonDigest(completion),
    'retained closed source delivery transition differs from current postconditions',
  );
  return {
    completion,
    baseline_config_digest: originalOperation.plan.old_config_digest,
  };
}

function sourceCorrectionWithCompletion(artifact, completion) {
  if (artifact.completion) {
    requireRebind(
      canonicalJsonDigest(artifact.completion) === canonicalJsonDigest(completion),
      'source correction completion changed after capture',
    );
    return artifact;
  }
  const { digest: _digest, ...body } = artifact,
    completed = { ...body, revision: 3, completion };
  completed.digest = canonicalJsonDigest(completed);
  validateSourceCorrectionArtifact(completed);
  return completed;
}

function correctionRequestForInputs({ values, access, root, config, db, operationPath, stored, frozenRequest }) {
  if (frozenRequest) {
    requireRebind(
      (values['--publish-operation'] === undefined ||
        values['--publish-operation'] === frozenRequest.publish_operation_id) &&
      projectRelativeExternalPath(root, values['--source-beforeimages'], 'retained source custody') ===
          frozenRequest.source_beforeimages.path &&
        projectRelativeExternalPath(root, values['--prior-system-update'], 'prior system update receipt') ===
          frozenRequest.prior_system_update.path &&
        canonicalJsonDigest(values.authorized_changed_paths) ===
          canonicalJsonDigest(frozenRequest.authorized_changed_paths),
      'repair inputs differ from the frozen source custody, prior update or scope',
    );
    return sourceCorrectionCurrentRequest({
      access,
      root,
      config,
      db,
      operationPath,
      operationBytes: stored.bytes,
      operation: stored.value,
      request: frozenRequest,
    });
  }
  return sourceCorrectionRequest({
    access,
    root,
    config,
    db,
    id: values['--repair-id'],
    operationPath,
    operationBytes: stored.bytes,
    operation: stored.value,
    beforeimagePath: values['--source-beforeimages'],
    priorSystemUpdatePath: values['--prior-system-update'],
    authorizedPaths: values.authorized_changed_paths,
    publishOperationId: values['--publish-operation'],
  });
}

async function runSourceCorrectionRepair(args, { onPhase } = {}) {
  const values = parseSourceCorrectionArgs(args),
    root = values['--project-root'],
    id = values['--repair-id'],
    mode = values['--mode'],
    access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root),
    operationPath = `${config.control.work_root}/${id}/${deliveryOperationName}`,
    sidecarPath = `${config.control.work_root}/${id}/${sourceCorrectionName}`,
    db = database(root, config, true);
  try {
    const run = async () => {
      const stored = readOperation(access, operationPath, id, root, true),
        requireSidecar = () => {
          requireRebind(access.fileExists(sidecarPath, 'source correction repair presence'), 'source correction repair sidecar is missing');
          return readSourceCorrectionArtifact(access, sidecarPath);
        };
      if (mode === 'repair-transition') {
        return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
          const latest = readOperation(access, operationPath, id, root, true),
            artifact = requireSidecar(),
            currentConfig = loadRuntimeConfig(root),
            workspaceId = deriveWorkspaceId(latest.value.plan.repository_id, root),
            store = new HostStateStore(db, workspaceId);
          requireRebind(artifact.value.status === 'applied', 'source correction is not applied');
          const proof = closedSourceDeliveryTransition({
            access,
            root,
            config: currentConfig,
            db,
            operationPath,
            operationBytes: latest.bytes,
            operation: latest.value,
            artifact: artifact.value,
            store,
          });
          return {
            status: 'closed_config_transition_proven',
            operation_id: id,
            baseline_config_digest: proof.baseline_config_digest,
            transition: proof.completion,
            transition_digest: canonicalJsonDigest(proof.completion),
            caller_owner_cas_required: true,
            runtime_accepted: false,
            writes_host_state: false,
          };
        });
      }
      if (mode === 'repair-inspect') {
        if (access.fileExists(sidecarPath, 'source correction repair presence')) {
          const artifact = readSourceCorrectionArtifact(access, sidecarPath).value,
            current = correctionRequestForInputs({
              values,
              access,
              root,
              config,
              db,
              operationPath,
              stored,
              frozenRequest: artifact.request,
            });
          if (artifact.status === 'applied')
            validateSourceCorrectionBridge({ access, root, config, db, operationPath, operationBytes: stored.bytes, operation: stored.value, artifact });
          return {
            status: artifact.status === 'applied' ? 'applied' : 'repair_apply_required',
            operation_id: id,
            request_id: artifact.request.request_id,
            request_digest: canonicalJsonDigest(current),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        }
        const request = correctionRequestForInputs({ values, access, root, config, db, operationPath, stored });
        return {
          status: 'inspect_ready_unauthorized',
          operation_id: id,
          request_id: request.request_id,
          request_digest: canonicalJsonDigest(request),
          source_change_count: request.source_changes.length,
          authorized_changed_paths: request.authorized_changed_paths,
          writes_host_state: false,
        };
      }

      if (mode === 'repair-plan') {
        return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
          const latest = readOperation(access, operationPath, id, root, true);
          if (access.fileExists(sidecarPath, 'source correction repair presence')) {
            const existing = readSourceCorrectionArtifact(access, sidecarPath),
              current = correctionRequestForInputs({
                values,
                access,
                root,
                config: loadRuntimeConfig(root),
                db,
                operationPath,
                stored: latest,
                frozenRequest: existing.value.request,
              });
            if (existing.value.status === 'applied') {
              validateSourceCorrectionBridge({ access, root, config: loadRuntimeConfig(root), db, operationPath, operationBytes: latest.bytes, operation: latest.value, artifact: existing.value });
              return { status: 'applied', operation_id: id, request_id: current.request_id, sidecar_path: sidecarPath, writes_host_state: false };
            }
            return {
              status: 'planned',
              operation_id: id,
              request_id: current.request_id,
              request_digest: canonicalJsonDigest(current),
              sidecar_path: sidecarPath,
              writes_host_state: false,
            };
          }
          const currentConfig = loadRuntimeConfig(root),
            request = correctionRequestForInputs({ values, access, root, config: currentConfig, db, operationPath, stored: latest }),
            artifact = sealSourceCorrection('requested', id, request);
          await access.writeExclusive(sidecarPath, json(artifact), 'source correction repair request');
          onPhase?.('planned');
          return {
            status: 'planned',
            operation_id: id,
            request_id: request.request_id,
            request_digest: canonicalJsonDigest(request),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        });
      }

      return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
        const latest = readOperation(access, operationPath, id, root, true),
          existing = requireSidecar();
        requireRebind(sha(latest.bytes) === sha(stored.bytes), 'original delivery operation changed before source correction');
        if (mode === 'repair-resume') {
          const current = sourceCorrectionCurrentRequest({
            access,
            root,
            config,
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation: stored.value,
            request: existing.value.request,
          });
          if (existing.value.status === 'applied')
            validateSourceCorrectionBridge({ access, root, config, db, operationPath, operationBytes: stored.bytes, operation: stored.value, artifact: existing.value });
          return {
            status: existing.value.status === 'applied' ? 'applied' : 'repair_apply_required',
            operation_id: id,
            request_id: current.request_id,
            request_digest: canonicalJsonDigest(current),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        }

        requireRebind(mode === 'repair-apply', 'unsupported source correction mode');
        const current = sourceCorrectionCurrentRequest({
            access,
            root,
            config,
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation: stored.value,
            request: existing.value.request,
          }),
          report = parseExternalJson(values['--report'], 16 * 1024 * 1024, 'source correction report'),
          selfAttestation = currentNativeSelfAttestation(),
          completed = validateSourceCorrectionReport(report, current, access, selfAttestation);
        if (existing.value.status === 'applied') {
          requireRebind(
            canonicalJsonDigest(completed) === canonicalJsonDigest(existing.value),
            'source correction is already applied with different evidence; resume the exact operation',
          );
          return { status: 'applied', operation_id: id, request_id: current.request_id, sidecar_path: sidecarPath, writes_host_state: false };
        }
        await access.replaceAtomicAsync(
          sidecarPath,
          sha(existing.bytes),
          json(completed),
          'source correction repair application',
        );
        onPhase?.('applied');
        return {
          status: 'applied',
          operation_id: id,
          request_id: current.request_id,
          sidecar_path: sidecarPath,
          source_snapshot_digest: current.new_source.digest,
          writes_host_state: false,
        };
      });
    };
    return await run();
  } finally {
    db.close();
  }
}

function fenceBinding(plan, planDigest) {
  return {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: plan.project_ids,
    operation_id: plan.operation_id,
    manifest_digest: planDigest,
    request_digest: planDigest,
    bindings_digest: canonicalJsonDigest({ selector: plan.selector_digest, state: plan.state_digest }),
    closure_digest: canonicalJsonDigest({ old_receipt: plan.baseline_receipt, target: plan.target_config_digest }),
    bundle_digest: plan.bundle_digest,
  };
}

function exactContext(access, root, config, operation, db, hostStore, maintenanceReceipt, operationPath, operationBytes) {
  const plan = operation.plan;
  const old = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root);
  const target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, old, configPath).config;
  const receipt = readReceipt(access, config);
  sameIdentity(root, old, JSON.parse(plan.baseline_receipt));
  sameIdentity(root, target, receipt.value);
  const binding = runtimeBinding(access, old);
  const verifyCurrentState = () => currentState(db, plan.workspace_id, root, old, hostStore, maintenanceReceipt);
  const currentStateDigest = maintenanceReceipt
    ? hostStore.withMaintenanceInspection(maintenanceReceipt, verifyCurrentState)
    : verifyCurrentState();
  requireRebind(
    runtimeConfigDigest(old) === plan.old_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      binding.selector_digest === plan.selector_digest &&
      sha(
        runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
      ) === plan.initialization_schema_digest &&
      currentStateDigest === plan.state_digest,
    'current selector/schema/global state differs from plan',
  );
  if (binding.bundle_digest !== plan.bundle_digest) {
    requireRebind(
      operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
        ((operation.phase === 'fenced' && operation.revision === 2 && !operation.maintenance_released) ||
          (operation.phase === 'applied' && operation.revision === 3 && !operation.maintenance_released)) &&
        maintenanceReceipt,
      'Source drift requires the applied same-operation source correction under its original fence',
    );
    const sidecarPath = `${config.control.work_root}/${plan.operation_id}/${sourceCorrectionName}`,
      correction = readSourceCorrectionArtifact(access, sidecarPath);
    validateSourceCorrectionBridge({
      access,
      root,
      config,
      db,
      operationPath,
      operationBytes,
      operation,
      artifact: correction.value,
    });
    requireRebind(
      correction.value.request.new_source.digest === binding.bundle_digest,
      'source correction does not bridge the current runtime Source inventory',
    );
  }
  const currentYaml = access.readBytes(configPath, 'current authored YAML').toString('utf8');
  requireRebind(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1'
      ? currentYaml === plan.target_yaml
      : currentYaml === plan.baseline_yaml || currentYaml === plan.target_yaml,
    'authored YAML bytes differ from frozen target/baseline',
  );
  const nextReceipt = json({ ...JSON.parse(plan.baseline_receipt), config_digest: plan.target_config_digest });
  requireRebind(
    receipt.bytes.toString('utf8') === plan.baseline_receipt || receipt.bytes.toString('utf8') === nextReceipt,
    'initialization receipt changed outside rebind',
  );
  return {
    baseline: currentYaml === plan.baseline_yaml,
    oldReceipt: receipt.bytes.toString('utf8') === plan.baseline_receipt,
    nextReceipt,
    receiptBytes: receipt.bytes,
  };
}

/** Only the existing initialization receipt is rebound; caller-owned YAML is never written. */
export async function runRuntimeConfigRebind(args, { onPhase } = {}) {
  if (['repair-inspect', 'repair-plan', 'repair-apply', 'repair-resume', 'repair-transition'].includes(args[args.indexOf('--mode') + 1]))
    return runSourceCorrectionRepair(args, { onPhase });
  const values = parse(args),
    root = values['--project-root'];
  const access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root);
  const mode = values['--mode'],
    id = values['--repair-id'],
    delivery = values['--kind'] === 'runtime-config-delivery';
  const operationPath = `${config.control.work_root}/${id}/${delivery ? deliveryOperationName : operationName}`;
  const db = database(root, config, ['inspect', 'plan'].includes(mode));
  try {
    if (['inspect', 'plan'].includes(mode)) {
      const operation = frozenPlan(values, root, config, access, db);
      if (mode === 'plan') {
        access.ensureDirectory(`${config.control.work_root}/${id}`, 'config rebind operation directory');
        access.writeExclusive(operationPath, json(operation), 'config rebind operation');
      }
      return {
        status: mode === 'plan' ? 'planned' : 'inspect_ready_unauthorized',
        operation_id: id,
        operation_path: operationPath,
        writes_yaml: false,
        writes_receipt: false,
      };
    }
    return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
      let stored = readOperation(access, operationPath, id, root, delivery),
        operation = stored.value;
      const plan = operation.plan,
        binding = fenceBinding(plan, operation.plan_digest);
      const receiptFor = (fence) =>
        fence?.status === 'held' && canonicalJsonDigest(fence.binding) === canonicalJsonDigest(binding)
          ? { fence, token: plan.token }
          : undefined;
      const context = (fence) =>
        exactContext(access, root, loadRuntimeConfig(root), operation, db, store, receiptFor(fence), operationPath, stored.bytes);
      const verifier = {
        principal: 'vida-agent-project-config-rebind',
        projectIds: plan.project_ids,
        verifyAcquisition: (requested, prior) => {
          requireRebind(db.inTransaction, 'maintenance acquisition must verify inside the Host transaction');
          const acquisitionReceipt =
            prior?.status === 'held'
              ? { fence: prior, token: plan.token }
              : { fence: null, unfenced: true, prior };
          requireRebind(
            canonicalJsonDigest(requested) === canonicalJsonDigest(binding) &&
              canonicalJsonDigest(prior) === canonicalJsonDigest(observedMaintenance) &&
              currentState(
                db,
                plan.workspace_id,
                root,
                validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
                store,
                acquisitionReceipt,
              ) === plan.state_digest,
            'current maintenance/global state differs from plan',
          );
        },
        verify: async (held) => {
          const current = context(held);
          const complete = operation.phase === 'applied' && !current.baseline && !current.oldReceipt;
          const abandoned =
            operation.phase === 'abandoned_no_effect' && (delivery || current.baseline) && current.oldReceipt;
          if ((!complete && !abandoned) || canonicalJsonDigest(held.binding) !== canonicalJsonDigest(binding))
            return null;
          return {
            schema: 'MaintenanceReleaseAuthorization/v1',
            principal: verifier.principal,
            fence_digest: canonicalJsonDigest(held),
            closure_digest: binding.closure_digest,
            bundle_digest: binding.bundle_digest,
          };
        },
      };
      const store = new HostStateStore(db, plan.workspace_id, undefined, undefined, undefined, verifier, root);
      const observedMaintenance = store.readMaintenanceFence();
      const save = async (phase, released = false) => {
        const next = { ...operation, revision: operation.revision + 1, phase, maintenance_released: released };
        await access.replaceAtomicAsync(operationPath, sha(stored.bytes), json(next), 'config rebind operation phase');
        stored = { bytes: Buffer.from(json(next)), value: next };
        operation = next;
      };
      const current = context(observedMaintenance);
      if (mode === 'restore')
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'actual rollback is forbidden; resume forward',
        );
      if (operation.maintenance_released) {
        requireRebind(['applied', 'abandoned_no_effect'].includes(operation.phase), 'terminal phase invalid');
        requireRebind(
          operation.phase === 'applied'
            ? !current.baseline && !current.oldReceipt
            : (delivery || current.baseline) && current.oldReceipt,
          'terminal operation differs from current config/receipt',
        );
        return { status: operation.phase, operation_id: id, rollback_performed: false };
      }
      let held = observedMaintenance;
      const own = held && canonicalJsonDigest(held.binding) === canonicalJsonDigest(binding);
      if (mode === 'restore') {
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'actual rollback is forbidden; resume forward',
        );
        if (!held || (held.status === 'released' && !own)) {
          requireRebind(operation.phase === 'planned', 'own maintenance fence missing');
          await save('abandoned_no_effect', true);
          return { status: 'abandoned_no_effect', operation_id: id, rollback_performed: false };
        }
        requireRebind(own, 'foreign maintenance fence');
        await save('abandoned_no_effect');
      } else if (operation.phase === 'planned') {
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'root YAML edit must wait for held maintenance fence',
        );
        const acquired = store.acquireMaintenanceFenceWithRecordedToken(binding, plan.token);
        held = acquired.fence;
        onPhase?.('fence_acquired');
        await save('fenced');
        onPhase?.('fenced');
        return {
          status: delivery ? 'receipt_rebind_ready' : 'author_config_required',
          operation_id: id,
          maintenance_held: true,
          target_config_digest: plan.target_config_digest,
          writes_yaml: false,
          writes_receipt: false,
        };
      } else {
        requireRebind(own, 'foreign or absent maintenance fence');
        if (operation.phase === 'fenced' && current.baseline)
          return {
            status: 'author_config_required',
            operation_id: id,
            maintenance_held: true,
            writes_yaml: false,
            writes_receipt: false,
          };
        requireRebind(!current.baseline, 'target authored root YAML required');
        if (held.status === 'held') store.assertMaintenanceFence({ fence: held, token: plan.token });
        if (current.oldReceipt) {
          requireRebind(operation.phase === 'fenced' && held.status === 'held', 'receipt write needs fenced phase');
          await access.withExclusiveLockAsync(receiptPath, 'configuration receipt rebind', async () => {
            const latest = context(held);
            requireRebind(!latest.baseline && latest.oldReceipt, 'receipt/configuration changed before CAS');
            await access.replaceAtomicAsync(
              receiptPath,
              sha(latest.receiptBytes),
              latest.nextReceipt,
              'configuration receipt rebind',
            );
          });
          onPhase?.('receipt_rebound');
        }
        requireRebind(!context(held).oldReceipt, 'rebound receipt not observed');
        if (operation.phase !== 'applied') await save('applied');
        onPhase?.('applied');
      }
      if (held.status === 'held') await store.releaseMaintenanceFence({ fence: held, token: plan.token });
      else
        requireRebind(
          held.status === 'released' && ['applied', 'abandoned_no_effect'].includes(operation.phase),
          'maintenance release outcome differs',
        );
      onPhase?.('released');
      await save(operation.phase, true);
      if (delivery && access.fileExists(`${config.control.work_root}/${id}/${sourceCorrectionName}`, 'source correction repair presence')) {
        const sidecar = readSourceCorrectionArtifact(
            access,
            `${config.control.work_root}/${id}/${sourceCorrectionName}`,
          ),
          completion = closedSourceDeliveryTransition({
            access,
            root,
            config: loadRuntimeConfig(root),
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation,
            artifact: sidecar.value,
            store,
          }).completion,
          completed = sourceCorrectionWithCompletion(sidecar.value, completion);
        if (completed !== sidecar.value)
          await access.replaceAtomicAsync(
            `${config.control.work_root}/${id}/${sourceCorrectionName}`,
            sha(sidecar.bytes),
            json(completed),
            'source correction closed transition capture',
          );
        onPhase?.('transition_captured');
      }
      return { status: operation.phase, operation_id: id, rollback_performed: false, writes_yaml: false };
    });
  } finally {
    db.close();
  }
}
