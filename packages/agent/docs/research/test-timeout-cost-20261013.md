# Continuation and quarantine test cost

Research and bounded implementation decision, 2026-10-13. This does not activate
a new test runner, change recovery semantics or qualify a numeric gate.
The current owners remain [TESTING](../../TESTING.md), the development lifecycle,
and the existing CLEAR repair/parallel implementation plans.

## Observed boundaries

Selected runtime: Bun1.4.3; package dependencies: Mastra Core1.76.0 and
LibSQL1.26.0. Three blind read-only reviews and an independent custody review
separated two different problems:

- `delivered-work-continuation.test.ts` has a30000ms case exception. A prior
 223-record full-engine variant exhausted it; that log had no phase trace, so
 its exact slow phase is unknown. The failed root remains retained, never replayed.
- `project-upgrade-lifecycle.test.ts` has five expanded cases with90000ms
 exceptions that naturally age an abandoned lock for30000ms: pre-effect write
 and replace, activation move, and first/last publication writes. This is the
 production stale-lock condition, not the individual test timeout. All five
 passed in full run3ad33c8f; their observed case times were42.87–52.19s.

The current test split keeps the16×64-resource composite on the complete native
resume/reopen path. A separate223-record `normal-history` variant checks one
ledger beyond the generic JSON node limit, actual persistence, identical retry
and public receipt lookup. It does not replace the engine/restart assertions.
Fresh focused qualification:3PASS/110assertions,24.20s including provenance;
history3015.54ms, full composite18275.47ms. The latter used the existing opt-in
phase trace, so these are observed instrumented timings, not a speedup claim:

| Child phase | Elapsed ms |
| --- | ---: |
| bridge.open | 4590.70 |
| bridge.snapshot | 347.32 |
| bridge.resume | 4123.84 |
| bridge.reopen | 4011.31 |
| bridge.restart-snapshot | 326.90 |

Nested begin intervals were745.87–964.24ms, settle616.52–719.56ms;
storage initialization97.38/0.09/97.76ms. These overlap their parent phases;
do not add them to the parent totals. Logs: `.tmp/coverage-iteration-f43ef15/`
`batch-ledger-provenance-trace.log` and `batch-full-coverage.log` at repo root.

## Documentation and applicability

- [Bun SQLite](https://bun.com/docs/runtime/sqlite): `query()` caches compiled
 statements, not returned values. More query caching does not eliminate repeated
 JSON decode, integrity and lineage checks in our Host readers.
- [SQLite isolation](https://www.sqlite.org/isolation.html): an immediate
 transaction excludes other writers; own-connection writes are visible to later
 reads. This supports bounded reuse only before an intervening write. SQLite
 does not freeze project files, configuration or external authorization state.
- [Bun dates and times](https://bun.com/docs/test/dates-times): mocked time affects
 Date and date formatting. This is not proof of OS mtime aging, child-process time
 or terminal custody. Do not apply a global fake clock to the native recovery matrix.
- [Bun parallel execution](https://bun.com/docs/test/parallel): async cases can
 overlap waits; file workers have distinct globals. Neither establishes our
 descendant quiescence, package-resource eligibility or exact coverage receipt
 protocol. Existing parallel qualification tasks still govern adoption.
- [Bun profiling](https://bun.com/docs/project/benchmarking): CPU profiles can
 locate computation hotspots. First verify artifact creation on an inert control
 for the selected runtime; existing phase timings suffice for the present choice.
- [Mastra snapshots](https://mastra.ai/docs/workflows/snapshots): persisted workflow
 state enables resume; smaller context is recommended. It does not authorize
 dropping VIDA receipt validation, changing historical receipt bytes, disabling
 snapshot persistence or skipping a real reopen. No new engine/storage is needed.

## Alternatives and decision

1. **First: reuse validated producer data inside one transaction.** Extend the
 private producer-context result with its exact Work identity and validated
 delivered/initial receipts. Begin and settle keep their second project-context
 load, compare its identity, and consume those existing values before any DB
 write. Public readers and every later/async effect boundary remain fresh. No
 process cache, new public API, transaction held across await, or schema change.
 The existing initial-source observer expects14 Host row-query preparations per
 begin/settle; removing two repeated receipt readers projects10. That is an
 unimplemented count estimate, not measured elapsed improvement. Threading only
 the Host snapshot through those readers is a smaller trust change but leaves
 duplicate receipt parsing; use it if complete receipt reuse cannot preserve a
 current guard. Do not remove such a guard to meet the count.
2. **Then: overlap natural quarantine with independent work.** Prefer two
 independently owned fresh roots/children through the already-planned bounded
 producer protocol. Confirm each stopped child's terminal result, keep its lock
 bytes/dev/ino/mtime untouched, and perform its same-ID resume only after its own
 actual age threshold. Preserve each original deadline, failure custody and
 report binding. Five30s age intervals contain150s of serial age budget, but
 that is not150s of measured removable wall time; setup/checks already consume
 part of each interval. Measure two qualified roots before increasing overlap.
 This remains dependent on package-reader/resource-quiescence qualification.
3. **Reject shortcuts in the native witnesses.** Raising timeouts, touching or
 backdating an abandoned lock, sharing a live database, global clock replacement,
 and deleting restart/auth assertions change the evidence. Independent synthetic
 aged-lock fixtures can test age classification; they cannot replace an untouched
 process-death→quarantine→same-ID-resume proof. A new generic clock framework or
 snapshot layout is not justified by this measurement.

## Acceptance and stop rules

- Producer reuse: extend the existing count test, preserve exact Host/Journal/
 receipt results, and add config-drift denial after the first Host read. Cover
 ordinary, configured-frontier, initial-source and missing-receipt paths. Keep
 ambiguity/corruption/owner/expiry/CAS denials and a focused omitted-freshness
 negative control. Check the same fresh full-composite trace after implementation;
 no retained UNKNOWN root may be used as a benchmark subject.
 Explicitly include mechanical/no-work success and pending/UNKNOWN delivered
 repair denial. Keep the outer repair/write preflight, original run-ID and
 conflicting lifecycle-work/corrective-Journal checks on that early-return path.
 Preserve database/root identity, current config/project resolution and original
 intake byte/digest checks. Reuse ends at the first database/governance write;
 later currentness, Journal-write and settlement calls validate afresh, never
 from a snapshot retained on the producer handle.
- Quarantine overlap: distinct roots/tokens and sealed child environments; actual
 terminal/dependent-effect accounting; unchanged original locks throughout natural
 aging; all five exact interruption boundaries and UNKNOWN no-replay assertions
 retained. Stop on shared resource conflicts, uncertain descendants, stale inputs,
 lost report partitions or increased case failures. Do not activate global
 parallel coverage from a local timing pass.
- Root alone runs applicable static/focused checks, then one current full numeric
 operation when ready. Default5000ms, justified exceptions,600000ms complete
 operation cap, exact coverage, frozen complexity/CRAP and assertion-confirmed
 mutation gates stay unchanged. Publish each verified correction packet.
