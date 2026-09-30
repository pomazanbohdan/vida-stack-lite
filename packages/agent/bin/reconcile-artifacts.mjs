#!/usr/bin/env bun
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { applyResearchSourceIdentityRepair, planResearchSourceIdentityRepair } from './repair-research-records.mjs';
import { runReadOnlyDispatchRepair } from './reconcile-readonly-dispatch.mjs';
import { runRuntimeCodeRebind } from './runtime-code-rebind.mjs';
import { runRuntimeConfigRebind } from './runtime-config-rebind.mjs';
import { runDocumentationPolicyTransition } from './documentation-policy-transition.mjs';
import { runSynthesisQualificationRepair } from './reconcile-synthesis-qualification.mjs';
import { runSynthesisObservationCorrection } from './synthesis-observation-correction.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const required = (condition, message) => {
  if (!condition) throw new Error(`vida repair artifacts: ${message}`);
};
function parse(args) {
  const value = {};
  for (let i = 0; i < args.length; i += 2) {
    required(
      ['--mode', '--project-root', '--repair-id', '--actor', '--timestamp', '--records'].includes(args[i]) &&
        args[i + 1] &&
        !value[args[i]],
      'invalid arguments',
    );
    value[args[i]] = args[i + 1];
  }
  required(
    ['inspect', 'plan', 'apply', 'resume', 'restore'].includes(value['--mode']) &&
      path.isAbsolute(value['--project-root'] ?? '') &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value['--repair-id'] ?? ''),
    'mode, root or repair id invalid',
  );
  if (['inspect', 'plan'].includes(value['--mode']))
    required(
      value['--actor']?.trim() && value['--timestamp']?.trim() && value['--records'],
      'planning attribution or records missing',
    );
  else
    required(
      !value['--actor'] && !value['--timestamp'] && !value['--records'],
      'apply and resume use the frozen plan only',
    );
  return value;
}
function regular(file) {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'unsafe regular file');
  return readFileSync(file);
}
function evidenceComplete(root, plan) {
  const journal = regular(path.join(root, `.agent/work/${plan.repair_id}/repair-journal.v1.jsonl`)).toString('utf8');
  required(
    journal.endsWith('\n') &&
      journal.trimEnd().split('\n').at(-1) ===
        JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: plan.repair_id, phase: 'complete' }),
    'repair journal is not complete',
  );
  for (const change of plan.changes)
    required(sha(regular(path.join(root, change.path))) === change.after_sha256, 'repaired result bytes differ');
  required(
    sha(regular(path.join(root, plan.changelog_path))) === plan.changelog_after_sha256,
    'repaired changelog bytes differ',
  );
}
function boundMaintenance(root, config, plan, selectorBytes) {
  const selector = JSON.parse(selectorBytes.toString('utf8'));
  required(
    selector.payload_manifest_sha256 && /^[a-f0-9]{64}$/.test(selector.payload_manifest_sha256),
    'active bundle digest unavailable',
  );
  const projectIds = config.projects.map((item) => item.project_id).sort();
  const binding = {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: projectIds,
    operation_id: plan.repair_id,
    manifest_digest: sha(json(plan)),
    request_digest: plan.digest,
    bindings_digest: canonicalJsonDigest({
      records_root: plan.records_root,
      changelog_path: plan.changelog_path,
      paths: plan.changes.map((item) => item.path),
    }),
    closure_digest: canonicalJsonDigest({
      repair_id: plan.repair_id,
      plan_digest: plan.digest,
      target_digests: plan.changes.map((item) => item.after_digest),
      changelog_sha256: plan.changelog_after_sha256,
    }),
    bundle_digest: selector.payload_manifest_sha256,
  };
  const verifier = {
    principal: 'vida-agent-local-artifact-repair',
    projectIds,
    verify: async (fence) => {
      if (canonicalJsonDigest(fence.binding) !== canonicalJsonDigest(binding)) return null;
      evidenceComplete(root, plan);
      return {
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: verifier.principal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  return { binding, verifier };
}

/** Bundle-owned narrow current-v1 reconciliation; no historical ledger or observation rewrite. */
export async function runReconcileArtifacts(args, { onPhase } = {}) {
  if (args.includes('--kind') && args.includes('documentation-policy'))
    return runDocumentationPolicyTransition(args, { onPhase });
  if (args.includes('--kind') && args.includes('runtime-config')) return runRuntimeConfigRebind(args, { onPhase });
  if (args.includes('--kind') && args.includes('synthesis-qualification'))
    return runSynthesisQualificationRepair(args, { onPhase });
  if (args.includes('--kind') && args.includes('synthesis-observation-correction'))
    return runSynthesisObservationCorrection(args);
  if (args.includes('--kind') && args.includes('runtime-code')) return runRuntimeCodeRebind(args);
  if (args.includes('--kind')) return runReadOnlyDispatchRepair(args);
  const values = parse(args);
  const root = path.resolve(values['--project-root']);
  const access = requireSafeRepositoryAccess(root);
  const config = loadRuntimeConfig(root);
  const repairId = values['--repair-id'];
  const workRoot = path.join(root, '.agent', 'work', repairId);
  if (values['--mode'] === 'restore') {
    const selector = JSON.parse(
      access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector').toString('utf8'),
    );
    const cutoff = `.agent/cutover/${selector.generation}/cutoff-witness.json`;
    required(
      !access.fileExists(cutoff, 'first-work cutoff'),
      'restore is forbidden after the first-work cutoff; resume forward',
    );
    throw new Error('vida reconcile artifacts: pre-cutoff restore requires a separately bound undo plan');
  }
  if (['inspect', 'plan'].includes(values['--mode'])) {
    const recordPaths = JSON.parse(regular(path.resolve(values['--records'])).toString('utf8'));
    required(Array.isArray(recordPaths) && recordPaths.length === 2, 'exact two-record input required');
    const plan = planResearchSourceIdentityRepair({
      root,
      repairId,
      actor: values['--actor'],
      timestamp: values['--timestamp'],
      recordPaths,
      recordsRoot: config.research_decision.paths.research_records,
      changelogPath: config.research_decision.paths.changelog,
    });
    if (values['--mode'] === 'inspect')
      return {
        status: 'repairable_current_v1',
        repair_id: repairId,
        source_manifest_digest: plan.digest,
        changed_paths: plan.changes.map((item) => item.path),
        dependent_artifacts: [],
        historical_observations_changed: false,
      };
    access.ensureDirectory(`.agent/work/${repairId}`, 'repair work root');
    const file = path.join(workRoot, 'repair-plan.v1.json');
    const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(plan));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return {
      status: 'planned',
      repair_id: repairId,
      plan_digest: plan.digest,
      changed_paths: plan.changes.map((item) => item.path),
    };
  }
  const plan = JSON.parse(regular(path.join(workRoot, 'repair-plan.v1.json')).toString('utf8'));
  required(plan.repair_id === repairId, 'frozen repair identity differs');
  const selectorBytes = access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector');
  const { binding, verifier } = boundMaintenance(root, config, plan, selectorBytes);
  // Persist the capability before acquisition so interruption cannot strand an owned fence.
  const tokenPath = `.agent/work/${repairId}/research-repair-fence-token.txt`;
  let token;
  if (access.fileExists(tokenPath, 'research repair fence token')) {
    token = access.readText(tokenPath, 'research repair fence token').trim();
    required(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token),
      'saved research repair fence token invalid',
    );
  } else {
    required(values['--mode'] === 'apply', 'research repair fence token must exist for resume');
    token = randomUUID();
    access.writeExclusive(tokenPath, `${token}\n`, 'research repair fence token');
  }
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const database = openHostStateDatabase(sessionHandoffDatabasePath(root, config));
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, verifier, root);
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, token);
    store.assertMaintenanceFence(receipt);
    const lock = path.join(workRoot, 'repair-lock.v1.json');
    let hasLock = false;
    try {
      hasLock = lstatSync(lock).isFile();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const result = applyResearchSourceIdentityRepair({ root, repairId, resume: hasLock, onPhase });
    evidenceComplete(root, plan);
    await store.releaseMaintenanceFence(receipt);
    return { ...result, maintenance_generation: receipt.fence.generation, selector_sha256: sha(selectorBytes) };
  } finally {
    database.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    console.log(JSON.stringify(await runReconcileArtifacts(process.argv.slice(2))));
  } catch (error) {
    console.error(JSON.stringify({ status: 'blocked', message: error.message }));
    process.exitCode = 1;
  }
}
