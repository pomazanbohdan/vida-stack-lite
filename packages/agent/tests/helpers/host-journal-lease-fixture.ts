import type { WorkIdentity, WorkState } from '../../src/host-state.ts';
import { validateWorkState } from '../../src/contracts/work-state-schema.ts';
import type { CoordinationTicket } from '../../src/contracts/envelopes.ts';
import { parseMastraSessionLedgerState } from '../../src/orchestration/mastra-session-ledger-codec.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../../src/orchestration/persistent-session-handoff.ts';
import type { ScopedSourceSnapshot } from '../../src/orchestration/scoped-source-snapshot.ts';
import type { SessionHandoffContext } from '../../src/orchestration/session-handoff.ts';

/** Build a codec-valid journal from the identity, execution context and source it records. */
export function hostJournalFixture(input: {
  readonly workspaceId: string;
  readonly context: SessionHandoffContext;
  readonly runId: string;
  readonly sourceScope: ScopedSourceSnapshot;
  readonly stepId: string | null;
  readonly items: readonly MastraLedgerItem[];
  readonly completed: MastraSessionLedgerState['completed'];
}): MastraSessionLedgerState {
  if (input.context.scope_digest !== input.sourceScope.digest)
    throw new Error('Host journal fixture context must bind its source scope');
  const state: MastraSessionLedgerState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: input.workspaceId,
    work_id: input.context.work_id,
    attempt: input.context.attempt,
    run_id: input.runId,
    source_scope: input.sourceScope,
    step_id: input.stepId,
    items: input.items,
    completed: input.completed,
  };
  parseMastraSessionLedgerState(state);
  return state;
}

/** Project an active, identity-matched coordination ticket into its HostState lease. */
export function hostStateLeaseFixture(input: {
  readonly ticket: CoordinationTicket;
  readonly identity: WorkIdentity;
  readonly nativeSessionHandle: string;
  readonly generation: number;
}): NonNullable<WorkState['lease']> {
  const { ticket, identity } = input;
  if (
    ticket.status !== 'active' ||
    ticket.repository_id !== identity.repository_id ||
    ticket.project_ids.length !== identity.project_ids.length ||
    ticket.project_ids.some((projectId, index) => projectId !== identity.project_ids[index]) ||
    ticket.integrations_digest !== identity.integrations_digest ||
    ticket.work_id !== identity.work_id ||
    ticket.thread_id !== input.nativeSessionHandle ||
    ticket.generation !== input.generation
  )
    throw new Error('HostState lease fixture must match its active coordination ticket and identity');
  return {
    ticket_id: ticket.ticket_id,
    thread_id: ticket.thread_id,
    generation: ticket.generation,
  };
}

/** Build a schema-valid WorkState whose binding and execution match explicit source/context inputs. */
export function hostWorkStateFixture(input: {
  readonly identity: WorkIdentity;
  readonly workspaceId: string;
  readonly revision: number;
  readonly sourceScope: ScopedSourceSnapshot;
  readonly context: SessionHandoffContext;
  readonly runId: string;
  readonly binding: WorkState['binding'];
  readonly contracts: WorkState['contracts'];
  readonly lease: WorkState['lease'];
  readonly execution: WorkState['execution'];
  readonly lifecycle: WorkState['lifecycle'];
  readonly artifacts: WorkState['artifacts'];
}): WorkState {
  const { identity, binding, context, sourceScope, execution } = input;
  if (
    context.work_id !== identity.work_id ||
    context.scope_digest !== sourceScope.digest ||
    binding.repository_id !== identity.repository_id ||
    binding.project_ids.length !== identity.project_ids.length ||
    binding.project_ids.some((projectId, index) => projectId !== identity.project_ids[index]) ||
    binding.integrations_digest !== identity.integrations_digest ||
    binding.work_source_revision !== sourceScope.digest ||
    execution.run_id !== input.runId
  )
    throw new Error('HostState fixture identity, source, binding and execution context must agree');
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: input.workspaceId,
    revision: input.revision,
    binding,
    contracts: input.contracts,
    lease: input.lease,
    execution,
    lifecycle: input.lifecycle,
    artifacts: input.artifacts,
  };
  if (!validateWorkState(work)) throw new Error('HostState fixture must match WorkState/v1');
  return work;
}
