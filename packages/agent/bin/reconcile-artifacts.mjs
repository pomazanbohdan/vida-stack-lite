#!/usr/bin/env bun
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/host-state.ts').MaintenanceFence} MaintenanceFence */
/** @typedef {import('../src/host-state.ts').MaintenanceFenceBinding} MaintenanceFenceBinding */
/** @typedef {import('../src/host-state.ts').MaintenanceReleaseVerifier} MaintenanceReleaseVerifier */

/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
/** @type {(condition: unknown, message: string) => asserts condition} */
const required = (condition, message) => {
  if (!condition) throw new Error(`vida repair artifacts: ${message}`);
};
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} value @returns {value is string} */
function isString(value) {
  return typeof value === 'string';
}
/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}
/** @returns {NonNullable<typeof reconcileCliContracts['research-records']>} */
function researchContract() {
  const contract = reconcileCliContracts['research-records'];
  required(contract, 'research records contract unavailable');
  return contract;
}

/** @param {string[]} args @param {number} index @returns {string} */
function argAt(args, index) {
  return args[index] ?? '';
}

/** @param {Record<string, string>} values @param {string} key @returns {string} */
function selectedOption(values, key) {
  return values[key] ?? '';
}

/** @param {string[]} args @returns {Record<string, string>} */
function parse(args) {
  /** @type {Record<string, string>} */
  const value = {};
  const genericContract = researchContract();
  for (let i = 0; i < args.length; i += 2) {
    const key = argAt(args, i),
      optionValue = argAt(args, i + 1);
    required(
      Object.values(genericContract.optionsByMode ?? {})
        .flat()
        .includes(key) &&
        optionValue &&
        !value[key],
      'invalid arguments',
    );
    value[key] = optionValue;
  }
  const mode = selectedOption(value, '--mode');
  required(
    genericContract.modes.includes(mode) &&
      path.isAbsolute(value['--project-root'] ?? '') &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value['--repair-id'] ?? ''),
    'mode, root or repair id invalid',
  );
  const expectedOptions = reconcileExpectedOptions('research-records', mode, value);
  required(expectedOptions, 'research mode is not declared');
  required(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expectedOptions.sort()),
    'arguments differ from the declared mode',
  );
  if (['inspect', 'plan'].includes(mode))
    required(
      value['--actor']?.trim() && value['--timestamp']?.trim() && value['--records'],
      'planning attribution or records missing',
    );
  return value;
}
/** @param {string} file @returns {Buffer} */
function regular(file) {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'unsafe regular file');
  return readFileSync(file);
}
/** @param {string} root @param {ReturnType<typeof import('./repair-research-records.mjs').planResearchSourceIdentityRepair>} plan */
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
/** @param {string} root @param {ReturnType<typeof import('../src/config/runtime-config.ts').loadRuntimeConfig>} config @param {ReturnType<typeof import('./repair-research-records.mjs').planResearchSourceIdentityRepair>} plan @param {Buffer} selectorBytes @param {typeof import('../src/contracts/public-ingress.ts').canonicalJsonDigest} canonicalJsonDigest */
function boundMaintenance(root, config, plan, selectorBytes, canonicalJsonDigest) {
  /** @type {unknown} */
  const selectorValue = JSON.parse(selectorBytes.toString('utf8'));
  required(isRecord(selectorValue), 'active selector record malformed');
  const selector = selectorValue;
  required(
    isString(selector.payload_manifest_sha256) && /^[a-f0-9]{64}$/.test(selector.payload_manifest_sha256),
    'active bundle digest unavailable',
  );
  const projectIds = config.projects.map((item) => item.project_id).sort();
  /** @type {MaintenanceFenceBinding} */
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
  /** @type {MaintenanceReleaseVerifier} */
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
/** @param {string[]} args @param {{onPhase?: (phase: string) => void}} [options] */
export async function runReconcileArtifacts(args, { onPhase } = {}) {
  const kindIndex = args.indexOf('--kind'),
    kind = kindIndex >= 0 ? args[kindIndex + 1] : undefined;
  if (kind !== undefined) {
    const contract = reconcileCliContracts[kind];
    required(contract, 'unsupported artifact repair kind');
    const phaseOptions = onPhase === undefined ? {} : { onPhase };
    /** @type {Record<string, (argv: string[]) => unknown>} */
    const handlerTable = {
      projectUpgrade: async (argv) => (await import('./project-upgrade-repair.ts')).runProjectUpgradeRepair(argv),
      native: async (argv) =>
        (await import('./repair-native-delivery-evidence.mjs')).runNativeDeliveryEvidenceRepair(argv, phaseOptions),
      delivered: async (argv) =>
        (await import('./repair-delivered-work-continuation.mjs')).runDeliveredWorkContinuationRepair(argv),
      retarget: async (argv) => (await import('./repair-release-retarget.mjs')).runReleaseRetarget(argv, phaseOptions),
      preparation: async (argv) => (await import('./release-preparation.mjs')).runReleasePreparation(argv),
      workState: async (argv) => (await import('./repair-work-state.mjs')).runWorkStateRepair(argv),
      documentationPolicy: async (argv) =>
        (await import('./documentation-policy-transition.mjs')).runDocumentationPolicyTransition(argv, phaseOptions),
      runtimeConfig: async (argv) =>
        (await import('./runtime-config-rebind.mjs')).runRuntimeConfigRebind(argv, phaseOptions),
      synthesisQualification: async (argv) =>
        (await import('./reconcile-synthesis-qualification.mjs')).runSynthesisQualificationRepair(argv, phaseOptions),
      synthesisObservation: async (argv) =>
        (await import('./synthesis-observation-correction.mjs')).runSynthesisObservationCorrection(argv),
      runtimeCode: async (argv) => (await import('./runtime-code-rebind.mjs')).runRuntimeCodeRebind(argv),
      readonlyDispatch: async (argv) =>
        (await import('./reconcile-readonly-dispatch.mjs')).runReadOnlyDispatchRepair(argv),
    };
    const handlerName = contract.handler;
    required(typeof handlerName === 'string', 'artifact repair handler is unavailable');
    const handler = handlerTable[handlerName];
    required(handler, 'artifact repair handler is unavailable');
    return handler(args);
  }
  const values = parse(args);
  const { createCliHostStateStore, closeWorkspaceDatabaseWithAdmission, openCliHostStateDatabase } =
    await import('./workspace-database-cli.ts');
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { applyResearchSourceIdentityRepair, planResearchSourceIdentityRepair, parseResearchRepairPlan } =
    await import('./repair-research-records.mjs');
  const root = path.resolve(selectedOption(values, '--project-root'));
  const access = requireSafeRepositoryAccess(root);
  const config = loadRuntimeConfig(root);
  const repairId = selectedOption(values, '--repair-id');
  const workRoot = path.join(root, '.agent', 'work', repairId);
  if (selectedOption(values, '--mode') === 'restore') {
    /** @type {unknown} */
    const selectorValue = JSON.parse(
      access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector').toString('utf8'),
    );
    required(isRecord(selectorValue), 'active selector record unavailable');
    const generation = selectorValue.generation;
    required(isString(generation), 'active selector generation unavailable');
    const cutoff = `.agent/cutover/${generation}/cutoff-witness.json`;
    required(
      !access.fileExists(cutoff, 'first-work cutoff'),
      'restore is forbidden after the first-work cutoff; resume forward',
    );
    throw new Error('vida reconcile artifacts: pre-cutoff restore requires a separately bound undo plan');
  }
  if (['inspect', 'plan'].includes(selectedOption(values, '--mode'))) {
    /** @type {unknown} */
    const recordPathsValue = JSON.parse(regular(path.resolve(selectedOption(values, '--records'))).toString('utf8'));
    required(isStringArray(recordPathsValue) && recordPathsValue.length === 2, 'exact two-record input required');
    const recordPaths = recordPathsValue;
    const plan = planResearchSourceIdentityRepair({
      root,
      repairId,
      actor: selectedOption(values, '--actor'),
      timestamp: selectedOption(values, '--timestamp'),
      recordPaths,
      recordsRoot: config.research_decision.paths.research_records,
      changelogPath: config.research_decision.paths.changelog,
    });
    if (selectedOption(values, '--mode') === 'inspect')
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
  const plan = parseResearchRepairPlan(regular(path.join(workRoot, 'repair-plan.v1.json')));
  required(plan.repair_id === repairId, 'frozen repair identity differs');
  const selectorBytes = access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector');
  const { binding, verifier } = boundMaintenance(root, config, plan, selectorBytes, canonicalJsonDigest);
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
    required(selectedOption(values, '--mode') === 'apply', 'research repair fence token must exist for resume');
    token = randomUUID();
    access.writeExclusive(tokenPath, `${token}\n`, 'research repair fence token');
  }
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const database = openCliHostStateDatabase(root, sessionHandoffDatabasePath(root, config), workspaceId);
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, verifier, root);
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, token);
    store.assertMaintenanceFence(receipt);
    const lock = path.join(workRoot, 'repair-lock.v1.json');
    let hasLock = false;
    try {
      hasLock = lstatSync(lock).isFile();
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
    const result = applyResearchSourceIdentityRepair({
      root,
      repairId,
      resume: hasLock,
      ...(onPhase === undefined ? {} : { onPhase }),
    });
    evidenceComplete(root, plan);
    await store.releaseMaintenanceFence(receipt);
    return { ...result, maintenance_generation: receipt.fence.generation, selector_sha256: sha(selectorBytes) };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    if (process.argv[2] === '--help') {
      const { cliMetadataResult } = await import('./cli-metadata.ts');
      console.log(JSON.stringify(cliMetadataResult(['reconcile-artifacts', ...process.argv.slice(2)], {})));
    } else {
      console.log(JSON.stringify(await runReconcileArtifacts(process.argv.slice(2))));
    }
  } catch (error) {
    console.error(
      JSON.stringify({ status: 'blocked', message: error instanceof Error ? error.message : String(error) }),
    );
    process.exitCode = 1;
  }
}
