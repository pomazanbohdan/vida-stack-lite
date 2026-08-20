# Portable runtime testing stack

This profile verifies the reusable agent runtime; it does not turn Static
results into product Runtime evidence. Copy `agent-runtime/`,
`tests/agent-runtime/`, and `agent-runtime/tooling/` into another repository,
then configure its sidecar with that repository's product tests and runtime
acceptance.

## Entry points and reproducible setup

Prerequisites: Windows PowerShell 7+, Node.js 24.x, npm 11.x, Git, and the
trusted `gsd-1.11.0_ponytail-4.9.0` stack selected by the repository launcher.
The tooling is isolated from product dependencies. The v1.11 integration
mapping and its bounded optimization rules are recorded in
`agent-runtime/instructions/gsd-core-v1.11-integration.md`.

```powershell
# repository root
npm run agent-runtime:install
npm run agent-runtime:verify
```

The install command verifies the current GSD capability and all eight lifecycle
hook points. The verify command is the release gate for the reusable runtime.
It is intentionally manual:
the runtime changes infrequently and this repository does not require a CI/CD
pipeline. A successful focused test is diagnostic evidence, not a substitute
for this command.

| Root command | Use | Contract |
|---|---|---|
| `npm run agent-runtime:install` | Install/startup preflight | Installs the repository capability, renders all eight GSD lifecycle points and enables native Graphify |
| `npm run agent-runtime:backlog:list` | Backlog availability/readback smoke | Runs the pinned official CLI against the derived ledger; no lifecycle approval claim |
| `npm run agent-runtime:legacy:import -- <selected-root>` | Read-only migration inventory | Uses the bounded, cached historical importer; never imports lifecycle authority |
| `npm run agent-runtime:notify:runtime-fix -- --input <json> --output summary` | Runtime-fix developer notification | Writes one compact derived `RuntimeFixNotification/v1`; host delivery is explicit and missing capability remains a typed GAP |
| `npm run agent-runtime:test` | Fast local diagnosis | Vitest only; no clean install, coverage, audits or mutation claim |
| `npm run agent-runtime:scenarios` | Synthetic lifecycle diagnosis | Runs public-API temp-repository scenarios for R0-R4, typed `ask` clarification, correction, delivery and Runtime dispositions; external-ledger target-platformn remains outside the runtime API |
| `npx --prefix agent-runtime/tooling vitest run tooling/tests/runtime-post-delivery-feedback.test.cjs --config tooling/vitest.config.mjs --pool=forks --maxWorkers=1` | Post-delivery feedback diagnosis | Verifies receipt history, typed feedback analysis, clarification blocking and monotonic correction count |
| `npx --prefix agent-runtime/tooling vitest run tooling/tests/runtime-acceptance-manifest-repair.test.cjs tooling/tests/schema-parity.test.cjs --config tooling/vitest.config.mjs --pool=forks --maxWorkers=1` | Acceptance manifest migration diagnosis | Verifies the typed unsealed repair path, identity/AC preservation, revision CAS and schema/runtime parity |
| `npm run agent-runtime:verify:operator -- --manifest <VerifyBundle/v1> --output summary` | Bundled host verification | Runs non-serial checks with bounded concurrency (default 2), honors `serial:true` barriers, streams full check artifacts to derived files, and returns bounded redacted summary JSON |
| `npm run agent-runtime:verify:cached` | Repeated local release verification | Reuses tooling only when the package/lockfile, runtime/platform and required executables match a fingerprint; cache misses run pinned `npm ci`; the strict `agent-runtime:verify` path is unchanged |
| `npm run agent-runtime:cleanup:derived -- --days 7` | Derived-output retention plan | Dry-run only by default; lists stale derived files and never targets authoritative work/evidence |
| `npm run agent-runtime:cleanup:derived -- --days 7 --apply` | Explicit bounded cleanup | Removes only listed stale files under approved derived roots; reparse points and authority paths fail closed |
| `npm run agent-runtime:coverage` | Focused coverage diagnosis | Full Vitest suite with strict V8 thresholds; no mutation claim |
| `npm run agent-runtime:crap` | Complexity/coverage diagnosis | Reads the latest coverage map and applies the per-function CRAP gate |
| `npm run agent-runtime:mutation` | Focused mutation diagnosis | Full Stryker run with adaptive bounded concurrency and a breaking threshold of 100% |
| `npm run agent-runtime:mutation:profile -- <group-a,group-b>` | Selective mutation diagnosis | Runs selected complete execution groups serially; produces diagnostic group reports only and cannot publish the canonical aggregate |
| `npm run agent-runtime:verify` | Normal release verification | Clean install followed by the complete portable stack and full mutation run |
| `npm run agent-runtime:deep` | Expensive release/recovery verification | Same complete stack with 100,000 deterministic property cases |

Run commands from the repository root. The nested commands in
`agent-runtime/tooling/` are maintainers' diagnostic lanes; they do not create
another release profile.

The lockfile is authoritative. `npm ci` is the only clean-install command for
the manual profile. `npm install --package-lock-only` is allowed only while
deliberately updating the isolated tooling lockfile.

The active-checkpoint upgrade contract is also permanent runtime surface:
`upgradeActiveCheckpoints` must dry-run all active `resume.json` files, map only
known protocol aliases, apply per-file revision/source CAS migrations, record
`CheckpointProtocolMigration/v1`, remain idempotent, skip immutable
`COMPLETE` work, and return typed GAP items for ambiguous or malformed state.
Its apply path reads/plans/validates/replaces each file inside one lock rather
than dry-scanning and rereading the same checkpoint. It may normalize the
mutable checkpoint `resume.json` out of an unsealed `TRACE`/`PLAN`
`fingerprint_paths` list and records that change; sealed or active execution
scope requires explicit retag and returns a typed GAP. It must not invent
project bindings, acceptance contracts, leases, reviews, delivery authority
or product changes. A sealed VERIFY checkpoint with a matching compact
knowledge-history entry must instead report
`knowledge_context_recovery_available` and remain byte-immutable in both audit
and apply modes; only `restorePlatformKnowledgeContext/v1` may restore it.

`ImplementationScope/v1` (including acceptance/behavior/test/diagnostic and
attribution traces), `ReviewSetTriage/v1`, `CorrectionAuthorization/v1` and
`CheckpointConvergencePlan/v1` are the convergence controls for active work.
A scope contract is checked at `sealMutation`. Review-origin and high-risk
corrections still require triage; an accepted bounded local delivery/testing
defect uses one current `CorrectionAuthorization/v1` instead of a second
pre-correction review cycle. The third correction in one assurance epoch is a
typed scope-recovery GAP.
Legacy checkpoints whose raw feedback pointer is proven consumed are covered
by `reconcileConsumedFeedback/v1`; the operation clears only the stale pointer
and records compact consumption history without reusing the old receipt. A
strictly same-AC/same-file follow-up after one prior scope recovery is covered
by `recordScopeFollowUpAuthorization/v1`; it creates a new epoch and scope id,
rejects expansion, and requires fresh platform knowledge before mutation. The
focused convergence profile also drives a real `beginCorrection` into retired
`EXECUTE` and then records the follow-up in one additional CAS; an ordinary
exhausted EXECUTE without a typed correction boundary, active assurance, stale
CAS or scope expansion remains fail-closed.
The verification-scope amendment profile covers
`recordVerificationScopeAmendment/v1` for a stale mandatory focused assertion:
one additive test/spec/check path, unchanged ACs, fresh knowledge binding,
failure-atomic CAS and a typed coordination-rebind next action. It never
authorizes product scope expansion or changes the coordination ledger.
Accepted delivery/testing feedback that names a bounded cross-scope file union
is covered by `recordCrossScopeCorrectionAuthorization/v1`; tests verify its
single CAS scope expansion, stale-assurance invalidation, fresh knowledge
binding, replay rejection and unchanged exact-three policy. This operation is
an extension of the universal updater/lifecycle route, not a second updater or
a one-off checkpoint repair.
The universal upgrader reports legacy/unbound, authority-required,
scope-audit-required, scope-recovery-required and the typed
`recordScopeFollowUpAuthorization/v1` route for scope-follow-up states without
fabricating a checkpoint. This task's mutation run is intentionally not executed because the
current user explicitly excluded mutation testing; coverage/CRAP/lint/typecheck
remain separate gates.

Scope-integrity regression coverage is a separate focused profile. It verifies
that `sealMutation` records `ScopeSnapshot/v1` with implementation and
documentation hashes, performs the bounded two-pass stability check, excludes
unrelated repository `HEAD` changes from the implementation fingerprint,
classifies metadata-only and documentation-only changes, reports incomplete
coordination ownership as a typed GAP, and emits compact reports without
source text. A moving writer must produce `GAP-SCOPE-MUTATING-001`; the test
does not retry or silently widen the scope.

`RuntimeAssuranceContext/v1` and `RuntimeStatusDelta/v1` are shared compact
status components. Tests verify that immutable packet identity is hashed once,
status-only changes become deltas, and derived context never becomes authority.
Notification tests verify that partial fan-out records for one fix can be
merged into one immutable `RuntimeFixNotification/v1` without mixing source
revisions or fix identities.

`agent-runtime:verify` runs in fail-fast order:

1. `npm ci` from the isolated, pinned tooling lockfile.
2. Dependency-free Node and PowerShell contracts.
3. Vitest ZOMBIES, table/model, property, schema-differential, fault,
   concurrency, launcher and adversarial suites.

The policy contracts also verify agent allocation: R0/R1 stay session-first,
perspective slots never count as independent agents, specialists require a
bounded frozen packet, parallel writers have disjoint ownership, stale joins
fail closed, and exactly three fresh blind reviewers remain mandatory. Agent
count or available capacity is never accepted as evidence of quality.

Clarification contracts verify both the analysis and enforcement boundary:
the current session/orchestrator records `retrieve`, `infer`, `proceed` and
`block` decisions in the ordinary B/S/AC/GAP trace, then materializes a typed
`QuestionCandidate/v1` only for `ask`. The typed candidate has one decision,
one recommendation maximum, attributable answer binding, stale-source
invalidation and fail-closed blocking at seal/delivery. The public typed
`ask`/answer boundary is tested directly; documentation or schema presence
alone is not a passing runtime receipt.

Project-aware contracts verify protocol v4 separately from readable v2/v3
checkpoints: registry/tenant/project/task/Wiki bindings, exact thread and
tenant/project contours, v3 ticket upgrade without duplication, ledger OCC,
closed lifecycle-to-Backlog projection, `GAP-BACKLOG-SYNC-001`, and attributable
user-testing start/acceptance/feedback/rejection. A Backlog `Done` value never
substitutes for the current accepted `UserTestingReceipt/v1` or runtime ship
contract.

Shared-worktree coordination tests also cover expired-lease recovery: a
same-ticket re-claim retires all overlapping expired predecessors atomically,
records a typed recovery disposition, and leaves exactly one current claim for
continuity/seal. The explicit `recoverCoordinationClaim` path requires an
actor and decision pointer before the caller reclaims resources; stale claim
ordering must never shadow a fresh claim.

The coordination suite also covers `rebindCoordinationScope`: a stale or
missing PLAN binding can be atomically rebound to a current ticket, and an
accepted cross-scope correction can extend an existing ticket before its new
files are claimed, including advancing a same-work stale source revision while
recording the previous source. Expired foreign overlaps are recorded as recovery
dispositions; a live overlap, stale revision, replay, or frozen contour leaves
both checkpoint and ledger byte-identical. Rebinding never claims resources
implicitly, so mutation still requires the ordinary FIFO claim and seal gates.

The synthetic scenario command composes only the public typed API. It creates
temporary Git repositories and drives R0 read-only, R1 documentation,
R2 defect, R3 high-risk correction, R4 incident, typed `ask` clarification,
profile, delivery-feedback and Runtime-disposition paths. It does not claim
typed implementations for retrieval/inference orchestration, probe authority,
or external linked-defect target-platformn. It is the fastest end-to-end diagnostic
after a lifecycle change; it does not replace the complete release gate.

The post-delivery feedback profile is intentionally separate from the blind
review profile. It verifies that a human `feedback`/`rejected` receipt opens a
bound `DeliveryFeedbackAnalysis/v1`, that the prior delivery/testing receipt
remains in history, that a bounded local defect obtains one
`CorrectionAuthorization/v1`, that blocking clarification cannot be skipped,
and that `beginCorrection` consumes the authorization and increments
`correction_count`. A corrected
implementation starts a new review epoch: delivery/testing feedback resets
the prior `review_failure_streak` while preserving cumulative correction and
failure history. It must then pass the ordinary fresh three-review, reverse and
architect gates when the new epoch reaches its own trigger; this profile never
waives them.

`review-assurance.test.cjs` and `review-assurance-cli.test.cjs` cover the
optimization boundary. They prove that one immutable `ReviewPreflight/v1`
precedes any handle target-platformn, stale fingerprint/document hash/lease/dirty
overlap/dispatch state blocks before spawn, exact-three remains the default,
single-composite is rejected for protected risk classes, and a composite
receipt has three separate subverdict sections. They also cover typed host
capacity/release GAPs, compact wait counts, capability-cache epoch
invalidation, prompt isolation, changed-only fallback to full profile, bounded
concurrency/timeout, structured JSON redaction, output limits and derived-only
retention. Runtime-owned documentation paths are classified as full runtime
scope even when their suffix is `.md`. These are host/runtime contracts;
they do not authorize delivery or replace the three current blind receipts.

Architect-escalation contracts exercise typed `persistent` and `cross_scope`
findings, packet/revision bindings, attributable profile verification, replay
and stale/pointer alternatives, and separation of architect, reviewer,
implementer and correction approver. A plain legacy string finding remains
compatible, but cannot be used as a fabricated escalation trigger.
The first-wave architect regression cases also prove that a typed
`cross_scope` or wave-two `persistent` finding can dispatch one blind architect
while the current packet is frozen at streak zero; `ArchitectureDiagnosis/v1`
then authorizes the separated correction without synthesizing an
`ArchitectDecision/v1`. A no-defect diagnosis retires the reviewed packet and
opens a fresh packet boundary while preserving the seal, generation ledger and
diagnosis history.
`runtime-blind-architect-cycle.test.cjs` separately proves the repeated-cycle
contract: two failed review generations, two corrections, a requirements-only
`gpt-5.6-sol`/`high` diagnostic dispatch at assurance stage 4, an `ArchitectureDiagnosis/v1`, an
architect-separated correction when required, and a new full three-review plus
reverse-validation set before delivery. It also rejects code/review-history
pointers, wrong profiles and stale diagnosis bindings, and never counts the
architect as a review receipt. It also proves invalid architect assignment ->
typed attributable disqualification -> fresh unique dispatch -> accepted
diagnosis, while the retired dispatch remains unusable and its identities
remain permanently non-reusable.
Protocol-v3 dispatch tests exercise the public atomic
`recordReviewDispatchReservation` boundary. Exactly three unique handle IDs,
lenses and dispatch identities must be reserved for the frozen packet before
an exactly linked attestation gains authority. Partial, cancelled, duplicate,
stale and cross-packet inputs leave the checkpoint unchanged. Platform handle
release is not exposed by this portable runtime and remains
`GAP-AGENT-HANDLE-RELEASE-001` until the host provides an attributable release
operation.
4. Strict V8 coverage, then the CRAP gate using the same coverage map.
5. ESLint complexity/static checks and TypeScript JSDoc checking.
6. Separate runtime and tooling dependency audits.
7. The complete Stryker mutation run.

The full mutation run is last because mutation results are meaningful only
after all cheaper structural and behavioral gates pass. Failure stops the
command and keeps the relevant acceptance/GAP open.

The legacy migration adapter additionally has a latency and cache contract.
Tests must prove that a broad historical root returns within three seconds,
the default processing budget is one second and the accepted maximum is two
seconds, bounds stop traversal
before unrelated subtrees, and oversized files are not read. They also cover
cold/warm cache behavior, `--refresh`, corrupted cache, and concurrent cache
writers. The cache is tested as a disposable projection; no cache hit is
accepted as approval, review, delivery or Runtime evidence.

## Regression contract for discovered defects

Testing is a remediation gate, not a report-only activity. When adding or
updating a test exposes a defect in maintained runtime code, the test authoring
lane must automatically continue through the bounded loop below before it
reports the finding or advances to the next assurance gate:

```text
observe → classify → preserve regression → fix shared root cause
        → focused verify → update static evidence → report or continue
```

For every finding in the frozen scope:

1. Preserve the failing input or lifecycle sequence as a deterministic,
   public-boundary regression test. Record expected behavior, actual behavior,
   evidence pointer and the smallest affected symbol/path.
2. Classify the finding as runtime defect, test defect, tooling/environment GAP,
   expected fail-closed behavior, or an out-of-scope product/requirement
   issue. A failing assertion is not by itself permission to weaken a gate.
3. For a confirmed in-scope runtime defect, make the smallest shared root-cause correction immediately
   in the same bounded cycle. Do not stop
   after adding a test, do not patch only the named example, and do not add a
   speculative abstraction or fallback.
4. Re-run the new regression before and after the correction, then run the
   affected public contracts and focused static checks. Update coverage/CRAP
   evidence from the corrected source; never edit thresholds, exclude code,
   or claim a pass from the regression test alone.
5. Add stale/replay/duplicate, concurrency and cleanup assertions when the
   defect can affect persistent state. If the finding is a coverage gap, add a
   behavior-oriented counterexample first; if that counterexample exposes a
   defect, return to step 3 rather than closing the gap as test-only work.
6. Keep one compact resolution record in the active work evidence: finding
   classification, regression test, root-cause change, changed paths, focused
   result, remaining GAP and next action. Full logs remain in derived
   artifacts.

Automatic remediation is bounded by the frozen BR/SR/AC, implementation scope,
source revision, ownership lease and security/data/migration policy. Stop and
return a typed GAP instead of editing when the correction would change
requirements, public contract, acceptance, risk class, delivery authority,
checkpoint/ledger history or another workstream's files. Such a GAP must name
the exact operation or approval needed; it is not a successful test result.
One coherent root-cause fix is the default stopping point. A second correction
or a scope expansion follows the normal correction/triage/architect route and
must not become an unbounded self-check loop.

The mandatory post-fix sequence is:

1. Focused regression and affected contract tests.
2. Coverage and CRAP using the same current-source map.
3. Lint, typecheck, audits and lifecycle scenarios relevant to the change.
4. Fresh assurance evidence according to the normal lifecycle; no old receipt
   or fingerprint is reused after mutation.

Mutation remains a separate, explicitly scheduled gate. When the user or the
active work policy excludes mutation, the loop above still fixes and verifies
the defect but records mutation as `not_run`; it never fabricates a mutation
result or waits indefinitely for one.

Generated test directories (`node_modules`, `coverage`, `.vitest` and
`.stryker-tmp`) are excluded from implementation fingerprints only after
reparse-point inspection. Their contents must not invalidate a sealed source
fingerprint, while a junction/symlink using one of those names must fail closed.
Legacy CLI cache and mutation JSON are instead projected under the repository
root `.planning/agent-flow/` tree, outside a fingerprinted `agent-runtime/**`
scope. Tests prove their before/after writes do not change that fingerprint.
`reports` is not a generated-directory name: a real source `reports/` directory
must change the fingerprint, and a reparse point using that name must fail
closed.

Runtime-owned `.agent/**` and derived `.planning/**` paths are never part of
the implementation fingerprint, even when explicitly listed or reached by a
broad glob. Regression tests mutate both trees and require a stable hash,
mutate implementation source and require a changed hash, reject a control-only
scope, and drive review plus reverse-receipt persistence through
`advanceToDelivery` with `resume.json` present in the original path list.

Delivery contracts validate `DeploymentManifest/v1` through schema and public
runtime boundaries: exact work/source/seal/fingerprint/cycle binding, unique
and non-overlapping changed-file classification, ordered deployment payload
and AC-bound post-deployment checks. Blocking Runtime matrix tests use multiple
ACs and prove that only the union of current closing Runtime Evidence can cover
the receipt; Static, Code, nonclosing, stale and outside-manifest alternatives
fail.

## Test levels

| Level | Purpose | Required evidence |
|---|---|---|
| Unit and ZOMBIES | Zero, one, many; boundaries; invalid/empty; exceptional and happy cases for every public typed API | public CJS calls and negative assertions |
| Properties/model | Lifecycle command sequences, state invariants, schema round trips and malformed data | fast-check seed, replay path and shrinking result |
| Concurrency/fault | two-writer CAS linearizability; lock, read, parse, write, rename and ledger-readback failures | deterministic interleaving/fault receipt |
| Schema differential | generated valid/invalid instances agree between JSON Schema and runtime validators | Ajv/runtime parity matrix |
| Integration/E2E | non-root launcher, PowerShell/CLI boundary, path/reparse behavior and installed GSD gates | command output and environment disposition |
| Security/regression | traversal, reparse, stale receipt, duplicate/replay, Static-versus-Runtime and dependency audit | adversarial test and audit output |

The stack deliberately tests public typed operations and real file/CLI
boundaries. Test-only seams are limited to deterministic clocks, filesystem
faults, locks and process runners; they must preserve the same production
validator and transition path.

The standard manual profile fixes `FC_SEED=424242` and runs `numRuns=10000` for
critical properties. The deeper profile uses `numRuns=100000`. Record the seed
and counterexample in the work receipt. Reproduce a failure with the recorded
seed and replay path; do not replace it with an unseeded retry.

Windows reparse tests require permission to create a directory junction or
symlink. Tests first detect that capability. A missing privilege is a named
environment GAP, so the reparse AC remains open; it is never silently counted
as a passing security branch.

## Quantitative quality gates

V8/Istanbul coverage includes all maintained `lib/*.cjs` runtime libraries,
with no broad source excludes:

- lines: **100%**;
- statements: **100%**;
- functions: **100%**;
- branches: **at least 95%** globally.

Gate/CAS/path/evidence/transition behavior is a critical test-design subset,
not a second V8 percentage. It must have public-boundary ZOMBIES, property or
mutation counterexamples for both legal and fail-closed paths. The executable
coverage threshold remains the global profile above.

ESLint enforces cyclomatic complexity <=10 as a secondary absolute ceiling for
core runtime functions.
`npm run crap` parses the same CJS sources with Espree and combines
per-function V8/Istanbul hit data:

`CRAP = complexity² × (1 - coverage)³ + complexity`.

Every maintained function must have **CRAP <5** (a maximum of 4). At 100%
coverage this is equivalent to cyclomatic complexity below 5. The gate also
fails any function above the separate ESLint complexity ceiling, any unmapped
function, or missing coverage input. Nested function bodies are measured as
their own functions rather than added to their lexical parent. Its JSON report is
`agent-runtime/coverage/crap-report.json`. A narrow platform limitation is a
named GAP with test evidence; it cannot be hidden with a general ignore pattern
or used to waive the portable release gate.

CRAP 0 is neither attainable nor a useful target for executable functions:
with complete coverage the formula reduces to cyclomatic complexity, whose
minimum is 1. The `<5` contract therefore means simple covered functions score
1-4 while still preserving necessary validation and fail-closed boundaries.

Mutation testing runs through isolated Stryker. The target for every maintained
runtime guard is **100% effective mutations**: no survived or no-coverage
mutants. An apparent equivalent mutant is an analysis signal: simplify the
source expression or add a public counterexample until the full target has no
survived or no-coverage result. It is not a release waiver. Do not state a
current mutation score before a completed full run produces one.

Mutation evidence is not additive. `npm run mutation` is the one full
gate: it generates a source-bound Espree manifest, runs every stable semantic
domain with relevant public-boundary tests, and validates a no-gap/no-overlap
union before publishing one deterministic aggregate report and receipt under
`../.planning/agent-flow/test-output/mutation/`. Every top-level AST node and
source line in the three maintained libraries has exactly one owner. Missing
partitions, stale Git/source bindings, duplicate mutant identities,
survived/no-coverage/runtime-error results, or incomplete reports fail closed.
`Timeout` is accepted only as Stryker's killed-equivalent result. Release
evidence must come from this complete current invocation through
`npm run agent-runtime:mutation` or `npm run agent-runtime:verify`.

The normal per-mutant timeout is 5,000 ms. When the host is under load, a
maintainer may deliberately double that budget for one complete run with
`$env:AGENT_RUNTIME_MUTATION_TIMEOUT_MS='10000'; npm run agent-runtime:mutation`.
The override is bounded to 5,000–60,000 ms, changes no mutation target,
threshold, partition ownership or timeout disposition, and the exact value
must be recorded with the resulting report. Invalid values fail closed.

The complete mutation command has a separate **24-hour wall budget** so a
slow Windows host may finish without turning an individual infinite-loop
mutant into a day-long worker. The default is already 86,400,000 ms; it can
only be shortened or explicitly restated within the safe range by setting
`AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS` (60,000–86,400,000 ms). The per-mutant
5,000 ms safety timeout remains independent. The orchestrator emits compact
output by default; set `AGENT_RUNTIME_MUTATION_OUTPUT=full` only for a bounded
diagnostic run. Neither setting changes the target, threshold, semantic
partition ownership, or accepted mutation statuses.

The partition Vitest profile has a 30,000 ms test timeout by default. A long
differential-fuzz or contract test may use
`AGENT_RUNTIME_MUTATION_TEST_TIMEOUT_MS` from 30,000 through 3,600,000 ms for
one external mutation invocation. This is a mutation-only dry-run timeout; it
does not change normal test timeouts or the 5,000 ms per-mutant safety timeout.

For bounded clarification survivor diagnosis, maintainers may set
`AGENT_RUNTIME_MUTATION_VITEST_CONFIG=tooling/vitest.mutation-clarification.config.mjs`
and `AGENT_RUNTIME_MUTATION_REPORT` while running Stryker from the
`agent-runtime` directory. This selects only the clarification/scenario tests
and an isolated report; it never changes the default full release target or
its 100% threshold.

Source-contiguous execution groups run the exact semantic domains with six
workers by default over test-local temporary repositories. An external
diagnostic may set `AGENT_RUNTIME_MUTATION_CONCURRENCY` to an integer from 1
through 12; this changes only Stryker worker fan-out for that invocation. Each group
uses the union of the relevant public test profiles declared by its domains in
`tooling/mutation-partitions.cjs`; every reported mutant is mapped back to one
domain. `npm run mutation:manifest` validates and projects the current
ownership/source binding without running mutants. `npm run mutation:partition
-- <partition-id>` and `npm run mutation:group -- <group-id>` are bounded
diagnostics and never release substitutes. Tests must not change process-global
cwd/environment or share lock paths. Replay a flaky survivor with one worker.

For a bounded profile, use
`npm run mutation:profile -- <group-a,group-b>`. The selected groups are
validated against the current source-bound manifest and run serially, which
avoids duplicate spawn/wait work and keeps reports isolated. A partial profile
never writes the release aggregate and cannot satisfy the zero-survivor gate;
run the unqualified `npm run mutation` only after all groups are ready.

`npm run mutation` is the full semantic-partition Stryker gate across every
maintained runtime library. It publishes `mutation.json`,
`mutation-partition-manifest.json`, and `mutation-partition-receipt.json` only
after all partitions are current and complete. `GAP-TEST-DEPTH-001` stays open
until its completed results, coverage and CRAP/complexity satisfy this profile.

Mutation child processes receive an isolated Git environment
(`core.hooksPath=NUL`, `maintenance.auto=false`, optional locks disabled and
non-interactive prompts). This is process-local and does not change repository
configuration. A compact `MutationProgress/v1` file under the derived groups
directory records running/completed/failed target status; source revision and
source digest checks still run before and after every group.

The focused optimization regressions cover preflight cache hit/invalidation,
compact execution telemetry, knowledge snapshot caching, explicit checkpoint
analysis, typed local/cross-scope correction entry points and Git isolation.

## Evidence domains

| Domain | Owner | Evidence |
|---|---|---|
| Portable runtime | this file and `agent-runtime/tooling/package.json` | `agent-runtime:verify` or `agent-runtime:deep` |
| Installed GSD integration | current stack manifest, capability installer and launcher | capability active, all eight lifecycle hooks rendered, namespaced Workstream state, Graphify status/build/diff |
| Product behavior | `AGENT.sidecar.md` and routed product sources | component tests plus attributable DEV/UAT/production observation where an AC requires Runtime proof |

Capability installation and hook rendering may change repository-derived
state, so the portable npm package does not perform them implicitly. The
orchestrator runs that preflight before review/delivery. GSD Workstream state
must resolve only under
`.planning/agent-flow/workstreams/<work-id>/`; root-level GSD project files are
not test output and must not be created. Before a lifecycle gate, the launcher
materializes the derived Workstream configuration with `commit_docs=false` and
inherits native Graphify activation from the project namespace. It also
idempotently enables the pinned v1.11 native settings for agent-hint routing,
plan/schema drift and the advisory refactor trigger. These settings only reduce
duplicate discovery; they do not authorize mutation or delivery. Native
`verification.status` is queried once per current phase/source/revision and its
compact status, next action and evidence pointers are reused without replaying
the full verification run.

Native Graphify is also outside the portable quality score. Its graph is a
derived planning/review aid: `agent-runtime:graph:status`,
`agent-runtime:graph:build`, and `agent-runtime:graph:diff` validate freshness
and topology evidence, but never increase code coverage or close BR/SR/AC,
delivery, or Runtime acceptance.

Backlog.md is another separate integration boundary. Contract and mutation
tests use deterministic process-runner and filesystem seams; the delivery
preflight also performs a real read-only `agent-runtime:backlog:list` smoke when
the CLI is available. Never launch the long-running browser inside the
automated test stack. The operator starts it explicitly with
`agent-runtime:backlog:browser` and stops it with `Ctrl+C`.

The separate `portfolio-dashboard-contract.test.cjs` exercises the read-only
HTTP boundary, all Jira-style routes, normalized Backlog/runtime items and the
legacy-unassigned projection. It must not start the editable Backlog browser,
mutate a ledger or infer missing project/thread bindings.

For a nonblocking deferred, pending or failed Runtime disposition, the runtime
requires and preserves a `gap_or_defect_pointer`; the project/Backlog ledger
creates and owns the linked defect when one is required. The portable runtime
does not create external tasks, and a pointer is not Runtime acceptance.

Coverage, CRAP, lint, type checking, audits and mutation are Code/Static
evidence. They cannot close Runtime ACs. Decision evidence is the attributable
owner decision, Code is the reviewed implementation, Static is executable
verification output, Runtime is attributable user-visible/external
observation, and a GAP records any missing class. Product teams add their own
E2E and Runtime commands through the sidecar; this profile remains portable.

## Evidence to retain

For a release candidate, record the command, Node/npm versions, property seed
and replay path when present, exact coverage summary, CRAP maximum, audit
disposition, Stryker score/report, installed GSD preflight disposition and open
environment GAPs. Keep concise sanitized results or pointers in the active work
record. Do not commit `node_modules`, coverage directories, Stryker sandboxes,
full logs, secrets or generated Graphify projections.

## Failure triage

- Contract or Vitest failure: reproduce the named test directly; do not advance
  to coverage or mutation.
- Coverage failure: add behavior-oriented cases for reachable branches; remove
  only proven redundant code, never security/fail-closed guards for a metric.
- CRAP/complexity failure: keep every function below CRAP 5 and split
  responsibilities without weakening public
  validation or checkpoint atomicity.
- Mutation survivor: add a counterexample or simplify the source expression,
  replay narrowly for diagnosis, then obtain zero survived/no-coverage results
  in the final full run.
- Timeout/flakiness: replay with one mutation worker and the recorded property
  seed; shared cwd, environment and lock paths are test defects.
- Installed GSD/Graphify failure: keep it in the integration evidence domain;
  portable Code/Static success does not override a failed lifecycle preflight.
### Configured agent routing assurance

`agent-routing.test.cjs` covers the closed role registry, the three-level
`high`/`xhigh`/`max` policy, Luna-only research/implementation/review roles,
the stage-4 Sol blind architect, enabled/disabled selection, same-scope reuse
with source/context binding, mandatory fresh independent routes, stale registry
rejection, bounded task contracts, and compact decision digests. Routing tests
never create host handles; exact-three and architect dispatch continue to use
the existing assurance tests and host adapter contracts.

### Ponytail policy assurance

The role-scoped policy resolver is tested as a runtime boundary, not as a
global prompt hook. Required cases cover the closed role matrix, trusted
release and `SKILL.md` hash, cache hit/miss/epoch invalidation, compact
redacted receipts, v4 binding and v2/v3 typed backfill. Review, security,
verification and architect dispatches must remain Ponytail-free and exact
three. A degraded capability may be reported for read-only work only; a code
mutation fails closed. Policy tests must not weaken existing lifecycle,
coordination, reverse-validation, Runtime or delivery gates.

### Platform knowledge assurance

Compatibility regression also covers `restorePlatformKnowledgeContext`: a
sealed VERIFY checkpoint whose active context was lost by an older runtime may
restore only the exact context ID/digest from compact history in one CAS
revision. The test must prove sealed fingerprint/state remain unchanged,
wrong history/source/scope is rejected with a typed GAP, and no fallback file
or manual checkpoint edit is used.

`platform-knowledge.test.cjs` covers immutable context digest/binding, required
context before mutation, the separate documentation/skill validator and cycle
reset behavior. Schema parity covers `PlatformKnowledgeContext/v1`,
`DocumentationSkillValidation/v1`, `SkillChangeProposal/v1` and
`SkillUpdateResult/v1`. A validator warning remains visible evidence; only
`changes_required` blocks the review packet. Tests must prove that full skill
text, implementation history and prior findings do not enter reviewer or
architect context. Automatic skill updates require all source-example,
held-out, negative-transfer, regression and marketplace checks; unresolved
rules create a proposal rather than a speculative patch.

### Change-impact assurance

`runtime-change-impact.test.cjs` is the focused contract profile for
`ChangeImpactAssessment/v1`. It covers the complete pre → execute → post →
seal → packet binding, full-profile escalation for unknown/dirty/high-risk
edges, correction invalidation/history, stale fingerprint and scope rejection,
and universal-upgrader routing. Schema parity includes the closed v1 schema;
the existing scope snapshot, scope-integrity report, checkpoint, review
preflight, review batch and blind packet schemas carry only compact binding
fields.

Impact assessment must not add another reviewer or spawn/wait phase. The same
immutable scope snapshot and source fingerprint are reused by lifecycle gates.
A changed or unverifiable snapshot is a typed GAP and requires the selected
full profile; it is never hidden by a focused test result. The impact receipt
is Code/Static evidence only and cannot close Runtime acceptance.

