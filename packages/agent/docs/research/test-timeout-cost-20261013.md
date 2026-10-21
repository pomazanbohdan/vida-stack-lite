# Continuation and quarantine test cost

Research and bounded implementation decision, 2026-10-13. This does not activate
a new test runner, change recovery semantics or qualify a numeric gate.
The current owners remain [TESTING](../../TESTING.md), the development lifecycle,
and the existing CLEAR repair/parallel implementation plans.

## Observed boundaries

### tsrs compiler candidate — 2026-10-21

The npm registry reports `tsrs` latest as
`0.18.0-ts7.1.0-dev.20260929`, Apache-2.0. It is Oxc's Rust port of the
TypeScript7 compiler and language server. The isolated pilot below qualifies
only CLI execution and raw SDK declaration emission on this Linux host.

Current Source checks use Bun1.4.3 `bun check`; the package also retains
TypeScript7.0.2. Bun's [release notes](https://bun.com/blog/bun-v1.4.3)
already document native type checking. No evidence here identifies its engine
as tsrs. Adding another compiler for the same routine check has no measured
VIDA benefit. Keep the current gate and do not add tsrs as a normal dependency.
The owner subsequently authorizes a separate-agent `bunx --bun` experiment.
Its isolated installation and declaration outputs do not change Source
dependencies or qualify adoption. WORK owns the pilot's custody and outcomes.

The SDK declaration pilot targets the phase where build-package.ts runs
`typescript/bin/tsc` through Bun, while `bun check` emits no declarations.
The separate Luna installed the candidate through `bun x --bun tsrs@latest`
under Bun1.4.3, using a private cache and copied immutable94cd912 SDK inputs.
Both TypeScript7.0.2 and tsrs0.18.0 exit0 on the four SDK entrypoints. Each
emits91 `.d.ts` files with identical paths and bytes, and no JavaScript.
Valid and invalid tiny fixtures pass their expected exit/diagnostic controls.
A stable TypeScript7.0.2 consumer accepts a valid `LifecyclePhase` import from
the candidate declarations and rejects an invalid value with TS2322.

Raw parity does not qualify the final package: the existing declaration
postprocessing was not run. Both raw outputs contain the same internal/test
issuer names in three files. No alternating benchmark or RSS measurement was
collected, so speed remains INCONCLUSIVE. TypeScript7.1-dev versus7.0.2 also
changes the language version. Retain the current compiler until final package
acceptance and a measured benefit justify adoption. The full report, terminal
receipts and original failed attempts remain under
`/workspace/vida-tsrs-pilot-v1373-Tf8Pzt/attempt-2/{report.md,result.json,logs}`.

The [compatibility table](https://github.com/oxc-project/tsrs/blob/main/docs/COMPATIBILITY.md)
lists Linux/macOS packages but no Windows binary in0.18.0. Windows support in
upstream main is a next-release plan. The npm launcher declares Node>=16.20;
The Bun CLI launch is qualified by this pilot; the JavaScript API is untested.
The programmatic API is unstable, adds an
IPC/server boundary and does not consume our retained Babel AST. Preserve Babel
function identities, test/scenario links, Ajv, Bun coverage and all current
gates. Compiler replacement alone does not accelerate native fixture execution
or supply coverage, CRAP or assertion-confirmed mutation evidence.

### Mutation scratch successors — 2026-10-14

The sequential Stryker gate formerly launched a successor even after an
unobserved timeout. Causal scheduler controls reproduced that transition.
A second review found that ordinary direct exit left group termination
unobserved too. A native inert child plus a denied group probe reproduced
the missing observation; a separate empty-group control qualifies the normal
POSIX probe. The corrected owner records the raw direct result and fences
successors until affirmative group termination. It does not raise timeouts.

[Stryker configuration](https://stryker-mutator.io/docs/stryker-js/configuration/)
documents that `tempDirName` contains source copies and is entirely removed
after a successful run with `cleanTempDir:true`. The shared root cannot be
reused while a predecessor's effects remain uncertain.
[Bun subprocess documentation](https://bun.com/docs/runtime/child-process.md)
defines `exited`, `exitCode` and `signalCode` for the direct subprocess;
these do not attest descendant termination. Reuse the existing owned-group
observer rather than introducing another supervisor or quiescence provider.

The initial real orphan-descendant control could not observe group cleanup on
this host and masked its primary assertion. Its failed root remains retained
at `/home/agent/.cache/vida-cloud-tooling/tmp/vida-mutation-owned-group-T3fkGn`.
It was not retried or removed. The replacement control creates no descendant
and restores its probe fault in `finally`; it qualifies refusal on missing
observation, not physical descendant cleanup. Root's affected completion run
passed47 cases across6 files. Logs remain under `/workspace/attachments/` as
`mutation-native-group-probe-red-20261014.log` and
`quality-resume-behavior-final-20261014.log`. This is not a mutation campaign.

### SDK freshness delivery — 2026-10-14

The existing native CI chain also forms the SDK and uploads its TGZ. Its
package file list omitted `dist/sdk-formation.json`, while retaining emitted
JavaScript. A payload projection regression reproduced that omission; adding
the receipt to the existing file list preserves the evidence through the
existing artifact route without another workflow or suite. Current local
outputs remain stale until separately formed current CI bytes and their receipt
are retrieved and joined. No local formation or stale-output fallback was used.

### Retained baseline runtime — 2026-10-14

Current development and tests remain on package-selected Bun1.4.3. The genuine
historical measurement binds1.4.2. Root retrieved the official historical binary
as non-executable evidence, matched its bytes to the retained report, and used
the current read-only consumer to validate108 historical Sources. No historical
runtime or suite ran. The exhaustive correspondence and executable CRAP plan
remain open; this receipt proves only baseline measurement compatibility.

### Original continuation cost observations

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
 The existing initial-source observer measured14 matching Host query API calls
 per begin/settle; the implementation now measures10 in each transaction. These
 are calls, not SQLite statement preparations/cache misses or elapsed improvement. Threading only
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
 receipt results, and add config-drift denial after the real Journal resume has
 finished its independent config check. Cover
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

## Implementation qualification, 2026-10-13

The bounded reuse is implemented. The existing fixture checks10/10 query calls
and unchanged Host/Journal/receipt and producer reservation state. A temporary
omission of the second project load causes an assertion failure: the changed
configuration is accepted instead of throwing the exact stale-config error.
Source restored byte-for-byte; failed fixture retained. This is a targeted
assertion control, not a complete mutation score. Mechanical/no-work, admitted
Work conflict, stale CAS, pending repair and real engine settlement also pass.

The first post-change full-composite trace passes25.39s versus the earlier18.28s;
different execution conditions preclude a speed claim. Matching query calls
fall by4/14, approximately28.6%, only within each observed transaction.

Historical inspection has two legitimate initialization-schema captures: receipt
validation and digest binding. Its existing case now observes both and a raw
reader substitution fails the assertion while preserving its root. A separate
configured-frontier execution caller used raw readBytes; the existing shared
verified helper replaces it. Its original test covers both endpoint and package
snapshot schema captures with exact persisted digest joins, no duplicate fixture.
New local admission has the same shared verified-reader correction. Its existing
reuse test calls the real factory each time and binds both observed schema
captures to persisted Host state; all5affected-file cases PASS35assertions.
The joined earlier packet passes19cases/183parent assertions, with86assertions
inside its one owned initial-source child. These are focused results, not a
complete current suite or global coverage/mutation admission.

The latest overlap audit identifies shared lifecycle faults/roots/cases,
prototype interception, timing resets and sibling cleanup. Per-case ownership
and descendant/effect quiescence must qualify before any two-root pilot.
[Bun lifecycle hooks](https://bun.com/docs/test/lifecycle) run cleanup after a
case; hook invocation is not proof of success. New bounded custody catches
setup/assertion failures; existing late native timeout custody is still a gap.

/tmp exhausted its capacity during qualification. A fresh disk-backed fixture
directory exposed additional I/O timeouts; those roots remain retained. Fresh
fixtures now use an executable RAM-backed directory outside the repository with
capacity checked before launch. This is environment selection, not a production
durability change or a matched performance comparison. Do not delete old failed
or UNKNOWN roots to make a benchmark faster.

## Current timing and storage mechanics, 2026-10-14

One bounded Bun1.4.3 timing probe reuses the selected runtime/environment and
one9s allowance. Its successful one-file control writes the documented
version1/files map after actual exit0. The two-file child emits a first-file
afterAll marker and a second-file start marker; the timing file is ENOENT there
and after observed SIGKILL. This rejects incremental timing reuse for partial
production attempts. [Bun timings](https://bun.com/docs/test/parallel#balancing-with-timings)
documents whole-file costs, not a guaranteed in-progress flush. No new profiler
or duplicate suite is adopted; partial/nested PASS rows remain diagnostic only.

A separate <=10s native SQLite primitive control on Bun1.4.3/SQLite3.53.4 holds
an ordinary reader, then observes EXCLUSIVE-first BUSY. After that reader's
actual successful terminal, one fresh held source connection writes, performs
complete TRUNCATE checkpoint and serializes bytes identical to the same-inode
main file. Another real reader is denied until exact source close. While held,
WAL is present with0bytes and SHM with32768bytes. Raw WAL-header deserialization
fails SQLITE_CANTOPEN, as [SQLite explicitly documents](https://www.sqlite.org/c3ref/deserialize.html).
Setting copied bytes18/19 to1 before deserialize is its documented workaround.
The distinct normalized memory copy preserves BLOBs and unsafe-range bigint
values; the bound source bytes and main file stay unchanged. Native primitive
qualification is1PASS/32assertions/272ms, with both reader terminals exit0.

The image merge owner now applies that workaround to closed, checkpointed
source copies only after validating original size/hash. It does not grant a
live-source capability, old-bundle quiescence, legacy exclusion or AUX removal.
Existing bundle-owned repair must configure EXCLUSIVE before the first identity
SQL and retain its exact source owners through preparation and publication;
the current close-then-image contract cannot establish that. The active guard,
layouts and loaders remain unchanged pending that repair qualification.

The exact probe uses `PRAGMA locking_mode=EXCLUSIVE` as first SQL, not
`BEGIN EXCLUSIVE`. Lock acquisition occurs on the following read; checkpoint
is outside an active transaction. [SQLite locking mode](https://www.sqlite.org/pragma.html#pragma_locking_mode)
documents held connection locks and the distinct WAL behavior. Do not generalize
the native WAL probe to all modes or lift the legacy-overlap guard. Public
preparation currently rejects that guard before merge_preparing journal write;
future activation still needs explicit same-operation recovery, not an invented
currently reachable stranded-operation defect.

Cold consumer controls use a fresh native child with a resolver-denial plugin.
[Bun plugins](https://bun.com/docs/runtime/plugins#onresolve) documents runtime
resolution callbacks on executed imports. The actual Host cold control denied
seven bridge edges before correction; after pure-owner routing no engine edge
resolves and a real file-backed Host DB closes successfully. An in-process class
spy establishes no open call only. This import correction preserves declared
Source/SDK closure and does not establish native artifact qualification or a
matched speedup. Current contained prepare+verify is53493.925ms, of which install
is4221ms and snapshot366ms. Its separate authorization fixtures, lifecycle calls
and pre/post integrity checks protect different boundaries; no justified removal
was found. Keep this diagnostic separate from case timings and full coverage.

The delivered-work repair interruption sequence was measured with temporary
opt-in phase marks on Bun1.4.3. Fixture/root559.7ms, plan1288.1ms, corrupt-intake
apply903.7ms, interrupted apply1652.4ms, first resume790.7ms, retry350.8ms and
final snapshot15.9ms total5561.3ms. Exact diagnostic:
`/workspace/attachments/delivered-repair-phase-diagnostic-20261014.log`.
It timed out at the unchanged5s default; every phase completed its observations,
but that does not turn the failed test into PASS. The marks were removed.
Adjacent work/ledger assertions now share one snapshot. Public calls still
revalidate fresh inputs because they span distinct effects and retained UNKNOWN
recovery. A contract-specific8s exception covers this five-call composite case;
other cases and operation budgets stay unchanged. No matched speedup is claimed.
[Bun runtime behavior](https://bun.com/docs/test/runtime-behavior.md) documents
the5000ms default and explicit per-test timeout argument. The current docs copy
is `/workspace/attachments/bun-test-runtime-current-20261014.md`.
