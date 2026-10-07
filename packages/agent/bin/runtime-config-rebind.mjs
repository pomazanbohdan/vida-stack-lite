import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { canonicalJsonDigest, MAX_CANONICAL_BYTES } from '../src/contracts/public-ingress.ts';
import {
  loadRuntimeConfig,
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
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRunState,
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { admittedResearchResultsForSynthesis } from '../src/orchestration/observed-synthesis-result.ts';

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
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const ajv = new Ajv2020({ strict: true, allErrors: true });
const operationSchema = JSON.parse(
  readFileSync(new URL('../schemas/config-rebind-operation.v1.schema.json', import.meta.url)),
);
const validateOperation = ajv.compile(operationSchema);
const validateDeliveryOperation = ajv.compile({
  ...operationSchema,
  $id: 'https://agent-runtime.invalid/schemas/config-delivery-operation.v1.schema.json',
  properties: { ...operationSchema.properties, schema: { const: 'SourceDeliveryConfigRebindOperation/v1' } },
});
const operationValidator = (delivery) => (delivery ? validateDeliveryOperation : validateOperation);
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

function targetConfig(access, root, oldConfig, targetPath) {
  const bytes = access.readBytes(targetPath, 'authored target YAML');
  const target = validateRuntimeConfigRepairTargetBytes(bytes, root);
  const unchanged = structuredClone(target);
  unchanged.agents.profiles.executor.model = oldConfig.agents.profiles.executor.model;
  unchanged.agents.profiles.executor.reasoning = oldConfig.agents.profiles.executor.reasoning;
  requireRebind(
    canonicalJsonDigest(unchanged) === canonicalJsonDigest(oldConfig) &&
      runtimeConfigDigest(target) !== runtimeConfigDigest(oldConfig),
    'only requested executor model/reasoning may change',
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
function readonlyKnownTerminal(db, root, config, row, item, host, store) {
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
  requireRebind(
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
      receipt.request.expected_journal.digest === row.digest &&
      receipt.request.expected_maintenance_generation === store.readHostStateSnapshot(receipt.identity).maintenanceGeneration,
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

export function currentState(db, workspace, root, config, existingStore) {
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
            readonlyKnownTerminal(db, root, config, row, item, hostRows, terminalReceiptStore) ??
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

function exactContext(access, root, config, operation, db, hostStore, maintenanceReceipt) {
  const plan = operation.plan;
  const old = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root);
  const target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, old, configPath).config;
  const receipt = readReceipt(access, config);
  sameIdentity(root, old, JSON.parse(plan.baseline_receipt));
  sameIdentity(root, target, receipt.value);
  const binding = runtimeBinding(access, old);
  const verifyCurrentState = () => currentState(db, plan.workspace_id, root, old, hostStore);
  requireRebind(
    runtimeConfigDigest(old) === plan.old_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      binding.selector_digest === plan.selector_digest &&
      binding.bundle_digest === plan.bundle_digest &&
      sha(
        runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
      ) === plan.initialization_schema_digest &&
      (maintenanceReceipt
        ? hostStore.withMaintenanceInspection(maintenanceReceipt, verifyCurrentState)
        : verifyCurrentState()) === plan.state_digest,
    'current selector/schema/global state differs from plan',
  );
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
        exactContext(access, root, loadRuntimeConfig(root), operation, db, store, receiptFor(fence));
      const verifier = {
        principal: 'vida-agent-project-config-rebind',
        projectIds: plan.project_ids,
        verifyAcquisition: (requested, prior) => {
          requireRebind(db.inTransaction, 'maintenance acquisition must verify inside the Host transaction');
          requireRebind(
            canonicalJsonDigest(requested) === canonicalJsonDigest(binding) &&
              canonicalJsonDigest(prior) === canonicalJsonDigest(observedMaintenance) &&
              currentState(
                db,
                plan.workspace_id,
                root,
                validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
                store,
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
      return { status: operation.phase, operation_id: id, rollback_performed: false, writes_yaml: false };
    });
  } finally {
    db.close();
  }
}
