import type { Database } from 'bun:sqlite';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { runtimeConfigDigest, type AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import {
  buildReadOnlyDispatchRepairPlan,
  type ReadOnlyDispatchRepairInput,
  type ReadOnlyDispatchRepairPlan,
} from '../src/orchestration/read-only-dispatch-repair.ts';
import { createCliHostStateStore } from './workspace-database-cli.ts';
export { isActivationEvidence } from '../src/orchestration/read-only-dispatch-repair.ts';

/** One coherent Host-owned snapshot; no rights or effects are granted by planning. */
export function planReadOnlyDispatchRepair(
  input: ReadOnlyDispatchRepairInput & { database: Database },
): ReadOnlyDispatchRepairPlan {
  const project = loadProjectSetContext(
    input.repositoryRoot,
    input.config,
    input.config.repository.repository_id,
    input.projectIds,
  );
  const store = createCliHostStateStore(
    input.database,
    input.workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    input.repositoryRoot,
  );
  const snapshot = store.readWorkSessionSnapshot(
    {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: input.workId,
    },
    input.attempt,
  );
  return buildReadOnlyDispatchRepairPlan({ ...input, snapshot, projectContext: project });
}

/** Host owns the producer-fenced commit and repeats only synchronous validation. */
export function applyReadOnlyDispatchRepair({
  database,
  plan,
  current,
}: {
  database: Database;
  plan: ReadOnlyDispatchRepairPlan;
  current: { repositoryRoot: string; config: AgentRuntimeConfig };
}): ReadOnlyDispatchRepairPlan {
  if (
    runtimeConfigDigest(current.config) !== plan.config_digest ||
    plan.digest !== canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan))
  )
    throw new Error('vida read-only dispatch repair: repair plan digest or current configuration invalid');
  const store = createCliHostStateStore(
    database,
    plan.workspace_id,
    undefined,
    undefined,
    undefined,
    undefined,
    current.repositoryRoot,
  );
  return store.commitReadOnlyDispatchRepair(plan);
}
