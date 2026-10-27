# First decision and effect separation slice

Status: design candidate blocked. This document does not authorize implementation.

## Intent and decision

The user selected separating production decisions from effect adapters while
retaining native contracts. The first slice must eliminate at least one expensive
fixture execution without losing a distinct native behavior. No such elimination
is currently established. Keep the current producer, HOLD, exact coverage gates,
budgets and UNKNOWN fences unchanged.

## Candidate: partially issued research preparation

`packages/agent/bin/run.ts:325` already has the pure `isResearchPreparationUnsafe`
predicate. At `run.ts:8888` the public command checks exposure and Journal items,
then performs admitted-context reads and activation writes. A proposed pure
decision would take the current exposure and the actual item fields
`issue_id`, `observation`, and `host_reservation`, and return a closed union:
`already_exposed`, `legacy_recovery`, `unsafe_preparation`, or `prepare`.
It must not inspect files, mutate state, grant authority, perform recovery or
carry a reusable authorization decision across an await or a transaction.
Preserve the current order: reject `possible`, perform legacy ledger recovery
for undefined exposure, then re-evaluate the resulting state before accepting
`preparing` and its items. Verify the current owner and version again at each
effect; the existing code review does not prove every later concurrent write.

The existing tests at `tests/run-entrypoint.test.ts:10605` and `:10804` both
create a two-research fixture. The first injects a real activation failure,
recovers the wave, checks retained history, and rejects a later repeat. The
second uses a persisted partially issued Journal, calls the public CLI, and
checks the refusal and the Work, Ledger, Journal and admission-attempt database
afterimages. It does not assert a complete filesystem afterimage. Their starting
states and public contracts differ. The first does not establish the second's
partial-state refusal. Replacing the second whole test with a pure matrix would
lose evidence. Adding a matrix while retaining both does not remove a heavy
fixture. On the available evidence this candidate is rejected as a performance
slice; no speedup or removable test is claimed.

If another existing native scenario is shown to cover the identical partial
state, refusal ordering, no-write afterimage and recovery boundary, a replacement
may be reconsidered with a case-by-case evidence map. Do not share a mutable
fixture between independent tests. Reuse a native scenario only if its own
producer and assertions already cover the same contract.

## Effects and authority

If a later slice is admitted, the controller must obtain current validated
Journal, configuration, Source, lease and authorization through their existing
owners immediately before the effect. Preserve version/CAS checks, denial before
context admission where required, the real no-write afterimage, and exact
successful, conflict, interruption and recovery controls. A pure answer is a
decision over supplied data, not an authorization or a durable receipt.

## Coverage and migration acceptance

The current `bun-cli-run` selects `bin/run.ts`, `tests/run-entrypoint.test.ts`
and `tests/bun-cache-routing.test.ts` through `tooling/mutation-partitions.ts`.
Moving any predicate to another Source file requires adding that file to the
selected inventory and accounting for every moved function and branch. The
old counters do not qualify changed Source. Keep the same behavioral case set,
exact F/L/S/B requirements and raw denominators; no new count or closed contour
is implied by a targeted test. A pure matrix alone does not exercise the
public `run.ts:8900-8903` guard. If a new test file replaces cases, update test
selection and prove the exact old/new case mapping without adding duplicates.

An implementable slice needs a named native case that is actually removed,
an existing retained native test for the same effect boundary, exact positive
and negative decisions, and an independently reviewed proof of authority and
ordering. Compare whole-command timing under compatible inputs and load; report
measured time separately from hypotheses. Scoped strict/lint, focused tests,
independent review and the current producer remain mandatory where admitted.
No timeout increase, fabricated authority, runtime/loader/DB cutover or consumer
effect is permitted. Revert the slice if case mapping, authority or inventory
cannot be demonstrated.

## Alternatives and future lanes

Keeping both native tests is safe but has no proven saving. Extracting only
the predicate is a maintainability change, not a justified performance fix.
Combining distinct stateful cases or sharing their live fixture is rejected.
Sharding is later work: the current focused reviewer does not admit this
contour. A future lane design must retain one total budget, complete disjoint
test selection, exact Source map, native custody and failure propagation. It
does not change the denominator, promote UNKNOWN or settle old effects. This
document introduces no merger or runner change.

The next decision is to identify a different concrete duplicate native contract
or obtain evidence that the candidate's complete public contract is retained
elsewhere. Until then no implementation slice is selected.

Independent read-only builder review confirmed that neither inspected native
test can be deleted on the present evidence. It also identified the guard-order
and database-only afterimage limits recorded above. The review did not run tests
or verify process-level fixture isolation.
