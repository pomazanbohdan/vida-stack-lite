#!/usr/bin/env bun
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import {
  finishWorkspaceDatabaseClose,
  withWorkspaceDatabaseClose as withOwnedClose,
  type DatabaseWorkOutcome,
} from '../src/config/workspace-database-raw.js';
import type { MaintenanceFence, MaintenanceFenceBinding, MaintenanceReleaseVerifier } from '../src/host-state.ts';
import type { planResearchSourceIdentityRepair } from './repair-research-records.ts';

type OptionValues = Record<string, string>;
type ResearchRepairPlan = ReturnType<typeof planResearchSourceIdentityRepair>;
type ResearchPlannerInput = Parameters<typeof planResearchSourceIdentityRepair>[0];
type RepairHandler = (argv: string[]) => Promise<unknown>;
type ReconcileOptions = { onPhase?: (phase: string) => void };
type JsonRecord = Record<string, unknown>;
type CanonicalJsonDigest = typeof import('../src/contracts/public-ingress.ts').canonicalJsonDigest;
type RuntimeConfig = ReturnType<typeof import('../src/config/runtime-config.ts').loadRuntimeConfig>;

const sha = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`vida repair artifacts: ${message}`);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function researchContract(): NonNullable<(typeof reconcileCliContracts)['research-records']> {
  const contract = reconcileCliContracts['research-records'];
  required(contract, 'research records contract unavailable');
  return contract;
}

function argAt(args: string[], index: number): string {
  return args[index] ?? '';
}

function selectedOption(values: OptionValues, key: string): string {
  return values[key] ?? '';
}

function parse(args: string[]): OptionValues {
  const value: OptionValues = {};
  const genericContract = researchContract();
  for (let i = 0; i < args.length; i += 2) {
    const key = argAt(args, i);
    const optionValue = argAt(args, i + 1);
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
  if (['inspect', 'plan'].includes(mode)) {
    required(
      value['--actor']?.trim() && value['--timestamp']?.trim() && value['--records'],
      'planning attribution or records missing',
    );
  }
  return value;
}

function regular(file: string): Buffer {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'unsafe regular file');
  return readFileSync(file);
}

function evidenceComplete(root: string, plan: ResearchRepairPlan): void {
  const journal = regular(path.join(root, `.agent/work/${plan.repair_id}/repair-journal.v1.jsonl`)).toString('utf8');
  required(
    journal.endsWith('\n') &&
      journal.trimEnd().split('\n').at(-1) ===
        JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: plan.repair_id, phase: 'complete' }),
    'repair journal is not complete',
  );
  for (const change of plan.changes) {
    required(sha(regular(path.join(root, change.path))) === change.after_sha256, 'repaired result bytes differ');
  }
  required(
    sha(regular(path.join(root, plan.changelog_path))) === plan.changelog_after_sha256,
    'repaired changelog bytes differ',
  );
}

function boundMaintenance(
  root: string,
  config: RuntimeConfig,
  plan: ResearchRepairPlan,
  selectorBytes: Buffer,
  canonicalJsonDigest: CanonicalJsonDigest,
): { binding: MaintenanceFenceBinding; verifier: MaintenanceReleaseVerifier } {
  const selectorValue: unknown = JSON.parse(selectorBytes.toString('utf8'));
  required(isRecord(selectorValue), 'active selector record malformed');
  const selector = selectorValue;
  required(
    isString(selector.payload_manifest_sha256) && /^[a-f0-9]{64}$/.test(selector.payload_manifest_sha256),
    'active bundle digest unavailable',
  );
  const projectIds = config.projects.map((item) => item.project_id).sort();
  const binding: MaintenanceFenceBinding = {
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
  const verifier: MaintenanceReleaseVerifier = {
    principal: 'vida-agent-local-artifact-repair',
    projectIds,
    verify: async (fence: MaintenanceFence) => {
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
export async function runReconcileArtifacts(args: string[], { onPhase }: ReconcileOptions = {}): Promise<unknown> {
  const kindIndex = args.indexOf('--kind');
  const kind = kindIndex >= 0 ? args[kindIndex + 1] : undefined;
  if (kind !== undefined) {
    const contract = reconcileCliContracts[kind];
    required(contract, 'unsupported artifact repair kind');
    const phaseOptions = onPhase === undefined ? {} : { onPhase };
    const handlerTable: Record<string, RepairHandler> = {
      projectUpgrade: async (argv) => (await import('./project-upgrade-repair.ts')).runProjectUpgradeRepair(argv),
      native: async (argv) =>
        (await import('./repair-native-delivery-evidence.ts')).runNativeDeliveryEvidenceRepair(argv, phaseOptions),
      delivered: async (argv) =>
        (await import('./repair-delivered-work-continuation.ts')).runDeliveredWorkContinuationRepair(argv),
      retarget: async (argv) => (await import('./repair-release-retarget.ts')).runReleaseRetarget(argv, phaseOptions),
      preparation: async (argv) => (await import('./release-preparation.ts')).runReleasePreparation(argv),
      workState: async (argv) => (await import('./repair-work-state.ts')).runWorkStateRepair(argv),
      documentationPolicy: async (argv) =>
        (await import('./documentation-policy-transition.ts')).runDocumentationPolicyTransition(argv, phaseOptions),
      runtimeConfig: async (argv) =>
        (await import('./runtime-config-rebind.ts')).runRuntimeConfigRebind(argv, phaseOptions),
      synthesisQualification: async (argv) =>
        (await import('./reconcile-synthesis-qualification.ts')).runSynthesisQualificationRepair(argv, phaseOptions),
      synthesisObservation: async (argv) =>
        (await import('./synthesis-observation-correction.ts')).runSynthesisObservationCorrection(argv),
      runtimeCode: async (argv) => (await import('./runtime-code-rebind.ts')).runRuntimeCodeRebind(argv),
      readonlyDispatch: async (argv) =>
        (await import('./reconcile-readonly-dispatch.ts')).runReadOnlyDispatchRepair(argv),
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
    await import('./repair-research-records.ts');
  const root = path.resolve(selectedOption(values, '--project-root'));
  const access = requireSafeRepositoryAccess(root);
  const config = loadRuntimeConfig(root);
  const repairId = selectedOption(values, '--repair-id');
  const workRoot = path.join(root, '.agent', 'work', repairId);
  if (selectedOption(values, '--mode') === 'restore') {
    const selectorValue: unknown = JSON.parse(
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
    const recordPathsValue: unknown = JSON.parse(
      regular(path.resolve(selectedOption(values, '--records'))).toString('utf8'),
    );
    required(isStringArray(recordPathsValue) && recordPathsValue.length === 2, 'exact two-record input required');
    const recordPaths = recordPathsValue;
    const plannerInput: ResearchPlannerInput = {
      root,
      repairId,
      actor: selectedOption(values, '--actor'),
      timestamp: selectedOption(values, '--timestamp'),
      recordPaths,
      recordsRoot: config.research_decision.paths.research_records,
      changelogPath: config.research_decision.paths.changelog,
    };
    const plan = planResearchSourceIdentityRepair(plannerInput);
    if (selectedOption(values, '--mode') === 'inspect') {
      return {
        status: 'repairable_current_v1',
        repair_id: repairId,
        source_manifest_digest: plan.digest,
        changed_paths: plan.changes.map((item) => item.path),
        dependent_artifacts: [],
        historical_observations_changed: false,
      };
    }
    access.ensureDirectory(`.agent/work/${repairId}`, 'repair work root');
    const file = path.join(workRoot, 'repair-plan.v1.json');
    const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    withOwnedClose(
      fd,
      () => {
        writeFileSync(fd, json(plan));
        fsyncSync(fd);
      },
      closeSync,
      'research plan write and descriptor close failed',
    );
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
  const tokenPath = `.agent/work/${repairId}/research-repair-fence-token.txt`;
  let token: string;
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
  let closeOutcome: DatabaseWorkOutcome<void> = { ok: true, value: undefined };
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, verifier, root);
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, token);
    store.assertMaintenanceFence(receipt);
    const lock = path.join(workRoot, 'repair-lock.v1.json');
    let hasLock = false;
    try {
      hasLock = lstatSync(lock).isFile();
    } catch (error: unknown) {
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
  } catch (error) {
    closeOutcome = { ok: false, error };
    throw error;
  } finally {
    finishWorkspaceDatabaseClose(
      database,
      closeOutcome,
      closeWorkspaceDatabaseWithAdmission,
      'research repair operation and admitted database close failed',
    );
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
  } catch (error: unknown) {
    console.error(
      JSON.stringify({ status: 'blocked', message: error instanceof Error ? error.message : String(error) }),
    );
    process.exitCode = 1;
  }
}
