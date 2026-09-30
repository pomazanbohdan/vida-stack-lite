import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
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
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  parseSessionBridgeRequest,
  sessionBridgeRunId,
  sessionBridgeDatabasePath,
} from '../src/orchestration/mastra-session-bridge.ts';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };

const requireRebind = (valid, message) => {
  if (!valid) throw new Error(`vida runtime-config rebind: ${message}`);
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const receiptPath = '.agent/runtime-initialization.v1.json';
const configPath = 'agent-runtime.config.v1.yaml';
const selectorPath = '.agent/active-runtime-selector.v1.json';
const operationName = 'runtime-config-rebind-operation.v1.json';
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const ajv = new Ajv2020({ strict: true, allErrors: true });
const validateOperation = ajv.compile(
  JSON.parse(readFileSync(new URL('../schemas/config-rebind-operation.v1.schema.json', import.meta.url))),
);
const validateReadonlyOwner = ajv.compile(workSchema);

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
  requireRebind(
    Object.keys(values).sort().join('|') === keys.sort().join('|') &&
      values['--kind'] === 'runtime-config' &&
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
  const profile = target.agents.profiles.executor;
  requireRebind(
    profile.model === 'gpt-6.1-sol' && profile.reasoning === 'medium',
    'target differs from requested executor profile',
  );
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
  const present = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!present) return [];
  const rows = db.query(`SELECT * FROM ${table} WHERE workspace_id=? ORDER BY payload`).all(workspace);
  return rows.map((row) => {
    const value = JSON.parse(row.payload);
    requireRebind(
      row.digest === canonicalJsonDigest(value) && Number.isSafeInteger(row.revision) && row.revision > 0,
      `${table} row integrity differs`,
    );
    return { ...row, value };
  });
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

export function currentState(db, workspace, root, config) {
  const host = checkedRows(db, 'agent_host_state', workspace);
  for (const row of host) {
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
  const mastra = checkedRows(db, 'agent_host_mastra_session_ledger', workspace);
  const frozen = [];
  for (const row of mastra) {
    requireRebind(Array.isArray(row.value.items), 'issued native outcome is pending/unknown');
    for (const item of row.value.items)
      if (item.issue_id !== null && item.observation === null) {
        try {
          frozen.push(readonlyUnknown(root, config, row, item, host));
        } catch (error) {
          requireRebind(false, `issued native outcome is pending/unknown: ${error.message}`);
        }
      }
  }
  const governance = checkedRows(db, 'agent_host_governance', workspace);
  requireRebind(
    governance.every((row) => !['reserved', 'commit_unknown'].includes(row.value.status)),
    'governance effect pending/unknown',
  );
  return canonicalJsonDigest({ host, mastra, governance, frozen });
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

function frozenPlan(values, root, config, access, db) {
  const receipt = readReceipt(access, config);
  const projects = sameIdentity(root, config, receipt.value);
  requireRebind(
    receipt.value.config_digest === runtimeConfigDigest(config),
    'plan requires unchanged baseline YAML and receipt',
  );
  const selected = selector(access);
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
    baseline_yaml: access.readBytes(configPath, 'baseline YAML').toString('utf8'),
    target_yaml: target.bytes.toString('utf8'),
    baseline_receipt: receipt.bytes.toString('utf8'),
    old_config_digest: runtimeConfigDigest(config),
    target_config_digest: runtimeConfigDigest(target.config),
    initialization_schema_digest: sha(schema),
    selector_digest: sha(selected.bytes),
    bundle_digest: selected.value.payload_manifest_sha256,
    state_digest: currentState(db, receipt.value.workspace_id, root, config),
    token: randomUUID(),
  };
  const operation = {
    schema: 'ConfigRebindOperation/v1',
    revision: 1,
    phase: 'planned',
    maintenance_released: false,
    plan,
    plan_digest: canonicalJsonDigest(plan),
  };
  requireRebind(validateOperation(operation), 'operation schema invalid');
  return operation;
}

function readOperation(access, operationPath, id, root) {
  const bytes = access.readBytes(operationPath, 'config rebind operation');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'operation exceeds bound');
  const value = JSON.parse(bytes.toString('utf8'));
  requireRebind(
    validateOperation(value) &&
      value.plan.operation_id === id &&
      value.plan.repository_root === root &&
      value.plan_digest === canonicalJsonDigest(value.plan),
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

function exactContext(access, root, config, operation, db) {
  const plan = operation.plan;
  const old = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root);
  const target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, old, configPath).config;
  const receipt = readReceipt(access, config);
  sameIdentity(root, old, JSON.parse(plan.baseline_receipt));
  sameIdentity(root, target, receipt.value);
  requireRebind(
    runtimeConfigDigest(old) === plan.old_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      sha(selector(access).bytes) === plan.selector_digest &&
      sha(
        runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
      ) === plan.initialization_schema_digest &&
      currentState(db, plan.workspace_id, root, old) === plan.state_digest,
    'current selector/schema/global state differs from plan',
  );
  const currentYaml = access.readBytes(configPath, 'current authored YAML').toString('utf8');
  requireRebind(
    currentYaml === plan.baseline_yaml || currentYaml === plan.target_yaml,
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
    id = values['--repair-id'];
  const operationPath = `${config.control.work_root}/${id}/${operationName}`;
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
      let stored = readOperation(access, operationPath, id, root),
        operation = stored.value;
      const plan = operation.plan,
        binding = fenceBinding(plan, operation.plan_digest);
      const context = () => exactContext(access, root, loadRuntimeConfig(root), operation, db);
      const verifier = {
        principal: 'vida-agent-project-config-rebind',
        projectIds: plan.project_ids,
        verify: async (held) => {
          const current = context();
          const complete = operation.phase === 'applied' && !current.baseline && !current.oldReceipt;
          const abandoned = operation.phase === 'abandoned_no_effect' && current.baseline && current.oldReceipt;
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
      const save = async (phase, released = false) => {
        const next = { ...operation, revision: operation.revision + 1, phase, maintenance_released: released };
        await access.replaceAtomicAsync(operationPath, sha(stored.bytes), json(next), 'config rebind operation phase');
        stored = { bytes: Buffer.from(json(next)), value: next };
        operation = next;
      };
      const current = context();
      if (mode === 'restore')
        requireRebind(current.baseline && current.oldReceipt, 'actual rollback is forbidden; resume forward');
      if (operation.maintenance_released) {
        requireRebind(['applied', 'abandoned_no_effect'].includes(operation.phase), 'terminal phase invalid');
        requireRebind(
          operation.phase === 'applied'
            ? !current.baseline && !current.oldReceipt
            : current.baseline && current.oldReceipt,
          'terminal operation differs from current config/receipt',
        );
        return { status: operation.phase, operation_id: id, rollback_performed: false };
      }
      let held = store.readMaintenanceFence();
      const own = held && canonicalJsonDigest(held.binding) === canonicalJsonDigest(binding);
      if (mode === 'restore') {
        requireRebind(current.baseline && current.oldReceipt, 'actual rollback is forbidden; resume forward');
        if (!held || (held.status === 'released' && !own)) {
          requireRebind(operation.phase === 'planned', 'own maintenance fence missing');
          await save('abandoned_no_effect', true);
          return { status: 'abandoned_no_effect', operation_id: id, rollback_performed: false };
        }
        requireRebind(own, 'foreign maintenance fence');
        await save('abandoned_no_effect');
      } else if (operation.phase === 'planned') {
        requireRebind(current.baseline && current.oldReceipt, 'root YAML edit must wait for held maintenance fence');
        const acquired = store.acquireMaintenanceFenceWithRecordedToken(binding, plan.token);
        held = acquired.fence;
        onPhase?.('fence_acquired');
        await save('fenced');
        onPhase?.('fenced');
        return {
          status: 'author_config_required',
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
            const latest = context();
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
        requireRebind(!context().oldReceipt, 'rebound receipt not observed');
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
