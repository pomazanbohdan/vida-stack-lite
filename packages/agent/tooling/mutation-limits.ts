/** Mutation runs have independent budgets; coverage and per-test limits stay with their owners. */
export const mutationLimits = Object.freeze({
  commandMs: 180_000,
  dryRunEnvelopeMs: 240_000,
  mutantTimeoutFactor: 2,
  mutantOverheadMs: 10_000,
  partitionMs: 900_000,
});
