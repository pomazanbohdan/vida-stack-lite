import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { WorkState } from '../host-state.js';
import type {
  MastraLedgerItem,
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
} from './persistent-session-handoff.js';

const internalReference = /^(?:agent|artifact|history|issue|local|mcp|pr):\/\/[A-Za-z0-9][A-Za-z0-9._~:/#-]*$/;
const relativePath = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*(?:#[A-Za-z0-9._~:/;=-]+)?$/;

/** Native citations are report data. Reject unsafe locators before their observation is committed. */
export function validateObservedEvidenceReferences(references: readonly string[]): void {
  if (!Array.isArray(references) || references.length < 1 || references.length > 64)
    throw new Error('observed evidence references are missing or unbounded');
  for (const reference of references) {
    if (typeof reference !== 'string' || reference.length < 1 || reference.length > 512)
      throw new Error('observed evidence reference is invalid');
    const locator = reference.includes('://') ? reference.slice(reference.indexOf('://') + 3) : reference;
    const valid = reference.includes('://') ? internalReference.test(reference) : relativePath.test(reference);
    if (!valid || reference.includes('\\') || locator.split(/[/#]/).some((part) => part === '.' || part === '..'))
      throw new Error('observed evidence reference is not a safe internal citation');
  }
}

/** Receipt authority cites one uniquely persisted native observation, never a caller-selected path. */
export function observedReceiptEvidenceReference(
  journal: MastraSessionLedgerSnapshot,
  actionId: string,
  observationDigest: string,
): string {
  const matches = [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items].filter(
    (item) =>
      item.request.action_id === actionId &&
      item.issue_id !== null &&
      item.observation?.action_id === actionId &&
      item.observation.issue_id === item.issue_id &&
      item.observation.output_digest === observationDigest &&
      item.observation.output_digest === canonicalJsonDigest(item.observation.summary),
  );
  if (
    matches.length !== 1 ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(journal.state.run_id) ||
    !/^[a-f0-9]{64}$/.test(actionId) ||
    !/^[a-f0-9]{64}$/.test(observationDigest)
  )
    throw new Error('receipt evidence has no unique persisted observation');
  return `artifact://session-observation/${journal.state.run_id}/${actionId}/${observationDigest}`;
}

type ObservationMultiplicity = { count: number; malformed: boolean; validatedItem: MastraLedgerItem | null };

/** Count the same broad population as observedReceiptEvidenceReference, including failed/foreign duplicates. */
function observationMultiplicity(items: readonly MastraLedgerItem[]): ReadonlyMap<string, ObservationMultiplicity> {
  const counts = new Map<string, ObservationMultiplicity>();
  for (const item of items) {
    const observation = item.observation;
    if (
      item.issue_id === null ||
      !observation ||
      observation.action_id !== item.request.action_id ||
      observation.issue_id !== item.issue_id
    )
      continue;
    const key = JSON.stringify([item.request.action_id, observation.output_digest]);
    const entry = counts.get(key) ?? { count: 0, malformed: false, validatedItem: null };
    counts.set(key, entry);
    try {
      if (observation.output_digest === canonicalJsonDigest(observation.summary)) {
        entry.count++;
        entry.validatedItem = item;
      }
    } catch {
      // The one-shot reference helper also rejects this tuple if any matching summary throws.
      entry.malformed = true;
    }
  }
  return counts;
}

function preparationObservationMatches(
  item: MastraLedgerItem,
  state: MastraSessionLedgerState,
  work: WorkState,
): boolean {
  const observation = item.observation;
  return Boolean(
    item.issue_id !== null &&
    observation?.status === 'reported_complete' &&
    observation.action_id === item.request.action_id &&
    observation.issue_id === item.issue_id &&
    item.request.run_id === state.run_id &&
    item.request.workflow_id === work.binding.workflow_id &&
    item.request.config_digest === work.binding.config_digest &&
    item.request.scope_digest === work.binding.work_source_revision,
  );
}

function validateOriginalPlanningJournal(
  journal: MastraSessionLedgerSnapshot,
  work: WorkState,
  planning?: MastraSessionLedgerState | null,
): void {
  if (
    planning &&
    (!journal.state.corrective_execution ||
      planning.schema !== 'MastraSessionLedger/v1' ||
      planning.workspace_id !== work.workspace_id ||
      planning.work_id !== journal.state.work_id ||
      planning.attempt !== journal.state.attempt ||
      planning.run_id !== work.execution.run_id ||
      planning.run_id === journal.state.run_id ||
      planning.corrective_execution)
  )
    throw new Error(
      'source write preflight: authenticated original planning journal is stale, foreign, or not applicable',
    );
}

function appendPreparationJournalEvidence(
  evidence: Map<string, MastraLedgerItem>,
  state: MastraSessionLedgerState,
  work: WorkState,
): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(state.run_id)) return;
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
  const counts = observationMultiplicity(items);
  for (const item of items) {
    if (!preparationObservationMatches(item, state, work)) continue;
    const observation = item.observation!;
    const entry = counts.get(JSON.stringify([item.request.action_id, observation.output_digest]));
    if (
      entry?.count !== 1 ||
      entry.malformed ||
      entry.validatedItem !== item ||
      !/^[a-f0-9]{64}$/.test(item.request.action_id) ||
      !/^[a-f0-9]{64}$/.test(observation.output_digest)
    )
      continue;
    evidence.set(
      `artifact://session-observation/${state.run_id}/${item.request.action_id}/${observation.output_digest}`,
      item,
    );
  }
}

/** Pure index over trusted current and already authenticated original planning state; no recovery reads. */
export function sourcePreparationJournalEvidence(
  journal: MastraSessionLedgerSnapshot,
  work: WorkState,
  planning?: MastraSessionLedgerState | null,
): ReadonlyMap<string, MastraLedgerItem> {
  validateOriginalPlanningJournal(journal, work, planning);
  const evidence = new Map<string, MastraLedgerItem>();
  if (planning) appendPreparationJournalEvidence(evidence, planning, work);
  appendPreparationJournalEvidence(evidence, journal.state, work);
  return evidence;
}
