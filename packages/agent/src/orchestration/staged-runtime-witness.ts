import { createHash } from 'node:crypto';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  selectWorkflow,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { openConfiguredMastraSessionLedger } from './persistent-session-handoff.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import { MastraSessionBridge } from './mastra-session-bridge.js';
import { deriveWorkspaceId } from '../workspace-identity.js';

export interface StagedRuntimeWitness {
  readonly schema: 'VidaStagedRuntimeWitness/v1';
  readonly payload_manifest_sha256: string;
  readonly config_sha256: string;
  readonly config_yaml: string;
  readonly config_digest: string;
  readonly workflow_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly ledger_revision: number;
  readonly ledger_digest: string;
  readonly ledger_state: MastraSessionLedgerState;
  readonly mastra_status: 'success';
  readonly mastra_observations_digest: string;
  readonly digest: string;
}

function requireWitness(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`staged runtime witness: ${message}`);
}

/** A local controller export from the validated config and persisted Mastra journal. */
export async function createStagedRuntimeWitness(input: {
  readonly repositoryRoot: string;
  readonly payloadManifestSha256: string;
  readonly workId: string;
  readonly attempt: number;
  readonly selection: WorkItemSelection;
}): Promise<StagedRuntimeWitness> {
  const { repositoryRoot, payloadManifestSha256, workId, attempt, selection } = input;
  requireWitness(/^[a-f0-9]{64}$/.test(payloadManifestSha256), 'payload digest is invalid');
  requireWitness(
    typeof workId === 'string' && workId.length > 0 && Number.isSafeInteger(attempt) && attempt >= 1,
    'work attempt is invalid',
  );
  const config = loadRuntimeConfig(repositoryRoot);
  const workflowId = selectWorkflow(config, selection).workflow_id;
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const databasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireWitness(
    access.fileExists(databasePath, 'staged witness persisted journal'),
    'persisted Mastra journal is absent',
  );
  const configBytes = access.readBytes('agent-runtime.config.v1.yaml', 'staged witness config');
  requireWitness(
    Buffer.from(configBytes.toString('utf8'), 'utf8').equals(configBytes),
    'staged configuration is not UTF-8',
  );
  let snapshot;
  const store = openConfiguredMastraSessionLedger(repositoryRoot);
  try {
    snapshot = store.resume(workId, attempt);
  } finally {
    store.close();
  }
  requireWitness(
    snapshot !== null &&
      snapshot.state.schema === 'MastraSessionLedger/v1' &&
      snapshot.state.work_id === workId &&
      snapshot.state.attempt === attempt &&
      snapshot.state.step_id === null &&
      snapshot.resume_status === 'complete' &&
      snapshot.state.run_id.length > 0 &&
      snapshot.version.digest === canonicalJsonDigest(snapshot.state),
    'persisted journal identity or digest is invalid',
  );
  const observed = snapshot.state.completed.flatMap((wave) => wave.items);
  requireWitness(
    observed.length > 0 &&
      observed.every(
        (item) =>
          item.issue_id !== null &&
          item.observation?.issue_id === item.issue_id &&
          item.observation.action_id === item.request.action_id &&
          item.observation.status === 'reported_complete' &&
          item.observation.output_digest === canonicalJsonDigest(item.observation.summary) &&
          item.request.run_id === snapshot.state.run_id &&
          item.request.workflow_id === workflowId &&
          item.request.config_digest === runtimeConfigDigest(config),
      ),
    'persisted journal lacks matching completed workflow observations',
  );
  const scopeDigest = observed[0]!.request.scope_digest;
  requireWitness(
    observed.every((item) => item.request.scope_digest === scopeDigest),
    'persisted journal scope differs between actions',
  );
  const bridge = await MastraSessionBridge.open({
    repositoryRoot,
    config,
    selection,
    context: { work_id: workId, attempt, scope_digest: scopeDigest },
    workflowId,
    workspaceId: deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
  });
  let mastra;
  try {
    mastra = await bridge.snapshot();
  } finally {
    await bridge.close();
  }
  const journalObservations = observed.map((item) => item.observation);
  requireWitness(
    mastra?.status === 'success' &&
      mastra.run_id === snapshot.state.run_id &&
      mastra.step_id === null &&
      mastra.requests.length === 0 &&
      canonicalJsonDigest(mastra.observations) === canonicalJsonDigest(journalObservations),
    'persisted Mastra run is not the same successful completed journal',
  );
  const body = {
    schema: 'VidaStagedRuntimeWitness/v1' as const,
    payload_manifest_sha256: payloadManifestSha256,
    config_sha256: createHash('sha256').update(configBytes).digest('hex'),
    config_yaml: configBytes.toString('utf8'),
    config_digest: runtimeConfigDigest(config),
    workflow_id: workflowId,
    work_id: workId,
    attempt,
    run_id: snapshot.state.run_id,
    ledger_revision: snapshot.version.revision,
    ledger_digest: snapshot.version.digest,
    ledger_state: snapshot.state,
    mastra_status: 'success' as const,
    mastra_observations_digest: canonicalJsonDigest(mastra.observations),
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}
