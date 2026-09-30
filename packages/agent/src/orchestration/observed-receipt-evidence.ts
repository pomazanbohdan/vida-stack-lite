import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';

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
    if (!valid || reference.includes('\\') || locator.split(/[\/#]/).some((part) => part === '.' || part === '..'))
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
