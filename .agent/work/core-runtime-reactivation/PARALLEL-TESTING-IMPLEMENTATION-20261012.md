# Parallel Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Root owns runtime/numeric checks; blind Luna workers have disjoint files.

**Goal:** Distribute the complete current test selection across auditable direct Bun shards and reach a qualified test/coverage operation within600000ms.

**Architecture:** One captured inventory/snapshot/transform supplies deterministic disjoint shard assignments. Two direct serial Bun children start under one supervisor and deadline; Root validates every receipt and merges counters once. Resource-conflicting waves remain exclusive; historical baseline remains serial.

**Tech Stack:** Qualified Bun1.4.3, TypeScript, existing Babel/Ajv/Istanbul tooling; no new dependencies.

**Spec:** PARALLEL-TESTING-DESIGN-20261012.md in this directory; current TESTING.md and test repair cycle plan.

## Global Constraints

- 600000ms qualified pinned test/coverage command deadline, including typecheck and nested CRAP;5000ms default per case with justified exceptions. CRAP's300000ms cap is clamped to remaining time; mutation remains independently invoked.
- Exact100% functions/lines/statements/branches, frozen CC/CRAP correspondence and assertion-confirmed Killed100% remain mandatory; a passing pilot is not global admission.
- One preparation and one final canonical validation; reuse maps/artifacts/inventory/input digests. No per-worker full AST/scan/hash rebuild or duplicate full suite.
- Preserve source/test/config bindings, CAS, authorization, ownership, durable sync, UNKNOWN/no replay, failed roots and exact reservation predicates.
- Build/install execute no suites. Serialv2/legacy readers and historical single-process/JUnit references remain compatible.
- Root alone qualifies; no observed-input/HEAD edits during measurement; one writer per file; commit/push each verified correction packet with ordinary hooks.

## Review Focus

1. A missing/duplicate shard file cannot hide behind aggregate counters.
2. A passing sibling cannot mask a crash or surviving descendant.
3. Per-shard timeout cannot reset the global deadline.
4. Exclusive labels must enforce scheduling, including shared outputs and hidden module/mocking dependencies.
5. Domain extraction cannot drop cases, rename scenarios silently or reuse mutable fixture state.

## Task1: Bounded scheduler and immutable assignment contract

**Files:** Create packages/agent/tooling/coverage-shard-plan.ts and tests/coverage-shard-plan.test.ts; modify package.json phase/input ownership once.

**Interfaces:** `ReviewedTestResource {test_file:string; test_sha256:string; review_scope_sha256:string; shared_resources:readonly string[]; exclusive_run:boolean; reviewer_ref:string}`; `CoverageShardAssignment {shard_id:string; tests:readonly string[]; selection_sha256:string; shared_resources:readonly string[]}`; `CoverageShardWave {exclusive:boolean; assignments:readonly CoverageShardAssignment[]}`; `CoverageShardPlan {schema:'VidaCoverageShardPlan/v1'; concurrency:2; waves:readonly CoverageShardWave[]}`. `planCoverageShards(tests:readonly InputDigest[], eligibility:readonly ReviewedTestResource[], concurrency:2, reviewScopeSha256:string):CoverageShardPlan`, using existing InputDigest from bun-coverage-evidence.ts. Caller projects selected test rows from already captured test_inputs; no rehash. The review scope digest binds already collected source/test/tool/config/runtime fingerprints and execution platform/package root metadata; no extra file pass. Compare both review scope and test_sha256 before admitting parallel eligibility; Source/dependency/provider changes invalidate stale reviews. Unknown files form singleton exclusive waves. Other waves contain at most two nonconflicting assignments. Use existing canonical digest/path validators.

- [x] RED controls: stub fails exact selected union; omitted review defaults exclusive; duplicate/foreign path and stale reviews deny; stable ties, resource bounds and exclusive barriers covered.
- [x] Pin the conflict rule: overlapping shared_resources IDs across assignments cannot share a wave; same-resource tests share one serial assignment. Global-exclusive files never overlap any assignment.
- [x] Implement bounded deterministic assignment and resource waves without another inventory pass. Initially balance eligible file counts in two serial batches with stable path/index ties; flush on a resource bridge. Complete same-scope file timing may later guide ordering only; partial body sums are not weights.
- [x] Root qualifies pure controls; blind reviewer checks exact union and resource enforcement. Strict checks and32tests/292assertions PASS. Scheduler bytes bind all existing quality projections; real omission control assertion-fails, then restored positive passes.
These controls complete pure scheduler development only. Delivery uses ordinary
commit/push hooks and Git publication evidence. Parallel test production and
tasks2–5 remain pending.

## Task2: Versioned shard evidence and one global merge

**Files:** run-bun-coverage.ts, bun-coverage-evidence.ts, bun-coverage-preload.ts, bun-coverage-report-validator.ts and existing synthetic/lifecycle/custody tests. One writer owns all shared protocol files.

**Interfaces:** Parallel run/child schemas explicitly v3/v2 respectively, referencing unchanged globalv2 input evidence semantics plus `assignment_plan_sha256`, `assigned_tests`, `shard_selection_sha256` and `shard_id`. Do not overload serialv2/v1 child interpretation. Validator consumes immutable assignment plan and existing canonical maps.

- [ ] RED controls: sibling/omitted/duplicate test claim; stale run/source/test/tool/config/assignment/runtime digest; duplicate PID; altered map/counter; missing shard receipt. Genuine old serial readers still pass.
- [ ] Bind each shard's exact argv/cwd/env and captured tests to the global plan. Keep the global test fingerprint unchanged; validate shard-selection digest separately.
- [ ] Assign disjoint physical coverage/JUnit/log/receipt/temp output paths per run/shard; reject aliases/collisions and writes into the immutable shared snapshot/maps before launch.
- [ ] Keep global manifest.tests/test_selection.tests complete; preload and process validators check assigned_tests completeness and reject sibling loads. Bind separate coverage receipt and supervisor terminal record by run/shard/PID.
- [ ] Require all assigned inputs in that shard, exact global union and valid terminal receipts. Allow sparse child source keys, validating every observed canonical map entry and counter shape with no foreign key and checked nonnegative safe-integer sums. Seed the aggregate from the full sealed map and require exact expected aggregate Source domain; perform existing canonical Source validation once globally.
- [ ] Root qualifies lifecycle/custody/legacy controls; independent review; publish. No historical parallel mode.

Foundation status: the v3/v2 decoders, assignment/terminal joins, exact output
roles, sealed argv/environment and sparse checked merge have focused structural
and native preload controls. Existing serial production still emits v2/v1;
Task2 remains partial until the supervised producer uses the qualified bindings.
Do not restart the completed primitive work or treat it as Task3 activation.
Bun serial worker IDs are child-local1, not shard identity. Config/preload/JUnit
options bind exact captured destinations and appear at most once; filters,
bailout, unknown options and bare positional values deny complete assignments.
The current TESTING owner retains the environment/default and clock rules.

## Task3: Async direct-producer supervision and global budget

**Files:** run-bun-coverage.ts, package.json test:coverage:pinned command and existing bounded-subprocess / coverage-run custody owners and tests. Same protocol writer owns runner; a separate writer may own disjoint adversarial tests.

**Interfaces:** Reuse exact current terminal/reservation predicates and `ReturnType<typeof executionBudget>`; no second deadline factory. The bounded foundation is `superviseCoverageProducers(launches:readonly PreparedCoverageProducer[], budget:ReturnType<typeof executionBudget>):Promise<CoverageProducerGroup>`. Prepared invocations bind shard ID, args, cwd, env and optional maximum duration. Outcomes retain launch_attempted, producer_pid, status/signal/error and direct terminal/accounting fields. Group resourceSafeToAdvance is false without a separate proof. Future runCoverageShards reuses this owner and the capturedInputs/plan, not another clock. The run-level release predicate requires every launched producer accounted under existing exact rules and explicit budget-spent evidence for unattempted launches; an unaccounted attempted sibling holds the shared lock. Not-started accounts for its launch alone. Root releases the one acquired handle once, never from a per-shard outcome. Keep direct producer reservation release separate from reviewed resource/descendant/effect quiescence. ChildOutcome keeps current fields; no success from PID absence. Command-entry deadline precedes required typecheck/preparation; concurrency initially2. Typecheck moves into the existing runner owner, removing the shell pre-step, not adding a duplicate scan.

- [ ] RED controls: two real marker producers overlap; deadline exhausted before launch; timeout with sibling active; ordinary nonzero; crash/missing receipt; known direct exit with live descendant; signal/late output; no-start versus unknown spawn.
- [ ] Replace synchronous launch for current parallel mode with bounded async direct children, explicit paths,5000ms default, per-shard streamed logs and existing cleanup/report reserve semantics. Account every launched sibling; retain uncertain roots and operations.
- [ ] Enforce ordered waves: no overlap with singleton exclusive waves. A successor needs resourceSafeToAdvance evidence, never merely direct child PASS/exit, released reservation, absent PID/marker or issued signal. Missing evidence retains UNKNOWN and stops successors. Clamp nested CRAP's300000ms cap to the remaining command deadline; qualify spent preparation/typecheck/report allowance and unchanged lock behavior.
- [ ] Zero/spent allowance forbids launch (never native timeout0); record unattempted evidence and preserve custody.
- [ ] Preserve original serial/historical path. Root runs bounded real child controls; reviewer audits failure/UNKNOWN/release behavior; publish.

First packet qualifies the command budget independently of parallel activation:
both maintained coverage aliases enter the same pinned launcher directly.
Its600000ms outer wall bound begins before package/runtime checks; the runner
shares the inherited monotonic deadline and30000ms terminal/report reserve,
typechecks current Source once under the lock, captures once and clamps the
producer/CRAP remainder. Historical selection shares the entry budget but omits
current typecheck and preserves original fixture/serial/reference semantics.
Malformed caller durations still fail before probes with supplied budgets.
That first budget packet did not qualify async supervision or waves. The bounded
foundation below now has focused qualification; resource-safe waves stay pending.

Next bounded foundation reuses `ReturnType<typeof executionBudget>`; do not
introduce a second monotonic deadline factory. Keep the supervisor in the runner
owner as an intended internal tooling API for one or two already-prepared Bun
invocations. Each launch uses the qualified `process.execPath`, remaining shared
allowance and raw async terminal/error observations. Account all launches before
returning the group disposition. An exact budget-spent prelaunch result describes
only that unattempted launch. Missing-PID async ENOENT is not the qualified sync
no-start tuple. Keep resourceSafeToAdvance false without a separate proof.

Use the same owner for the current single-producer serial path after its focused
controls qualify; preserve historical synchronous launch/argv/reference semantics.
Two-marker controls exercise the internal producer mechanics only, not shard
receipt admission, full parallel activation or global numeric evidence. No new
CLI/environment test override, generic subprocess framework, child-image mapping
or cgroup provider is authorized by this foundation. Stream current output as
before; disjoint parallel outputs/receipts remain a later protocol integration.

- [x] Qualify the bounded one-or-two-prepared-invocation API and current single
  serial producer caller with static checks, native close/error/timeout controls,
  existing map/capture-once and acquired-lock controls, and blind review.
- [ ] Bind actual two-shard invocation/output/receipt roles through v3/v2 and
  qualify the exact disjoint selection plus sparse merge under this supervisor.
  Apply TESTING's shard-output qualification: actual per-shard stdout/stderr
  capture is required; declared distinct log paths alone leave this item open.
  Use one existing pilot validation/merge path, not a duplicate report remerge.
- [ ] Provide separately reviewed descendant/effect quiescence before resource
  successors. Direct reservation release and native marker coordination do not
  qualify it; this host's cgroup creation probe remains provider-unavailable.

Current Source keeps historical synchronous invocation/reference semantics.
The real async timeout caller retains its UNKNOWN fixture after passing the
classifier assertions. New helper complexity is checked with the existing scoped
inventory; this is not frozen-budget/CRAP or global numerical admission.

## Task4: Domain extraction for the measured largest contour

Prerequisite to private CLI/Host parallel eligibility: shared package-resource
reads are not private merely because consumer roots differ. runtimePackageAccess
reads package.json using a read-side CAS lock; schema/template reads share that
executing package root. Keep `runtime-package-root:<owner-sha256>` resource
conflict until the following P1 contour qualifies. Use the canonical physical-owner
digest in that resource ID, not a raw path spelling.

**Package-reader files:** src/config/runtime-config.ts and existing package-reader
consumers in bin/runtime-config-rebind.ts, initialization/configured-context owners;
tests/runtime-package-access-reuse.test.ts and the existing native capture controls.
One writer owns the shared reader/call sites; separate reviewer checks scope.

- [ ] Reproduce overlapping package reads with real fresh isolated consumer roots and bounded readiness markers; retain actual collision/UNKNOWN evidence, no retry of archived operations.
- [ ] Use the existing verified-capture byte primitive for package-owned immutable resources only, preserving identity, byte bounds, active CAS/recovery denial, strict decoding and original causes. Keep every mutable consumer reader unchanged.
- [ ] Qualify fresh bytes after drift, unsafe/missing/oversized data, active lock/recovery, no write/fsync, strict UTF-8 and existing identity/schema/template digests. Reuse already captured resource rows; do not add a product test seam or stale cache.
- [ ] Qualify actual two-reader overlap and unchanged package sidecars/current fences. Unsupported/unqualified provider contours keep the common conflict tag; publish before removing it.

Reader status: the package-only verified adapter and selected configuration,
initialization/context/rebind callers have focused qualification. The native
two-child READY/GO control proves coordinated correct reads and no write/fsync,
not actual read overlap. Its former cross-child hrtime comparison is excluded:
qualified Bun1.4.3 origins are process-relative. Actual overlap, broader caller
closure and common-resource removal remain pending; keep the conflict tag.

**Files:** tests/runtime-config-rebind.test.ts; new tests/runtime-config-rebind-source.test.ts, runtime-config-rebind-delivery.test.ts, runtime-config-rebind-readonly.test.ts, runtime-config-rebind-history.test.ts, runtime-config-rebind-limits.test.ts; shared tests/helpers/runtime-config-rebind-fixture.ts; package.json phase membership and test associations.

**Interfaces:** Preserve existing fixture constructors/inspection types as a test-helper module; every invocation creates fresh owned state. Keep exact test names, assertions, case bounds and operation IDs. Retain source-policy/mutation semantics; no new product seam.

- [x] Capture case identities/cardinality from existing inventory/selection before moves; identify fixture-global mock/clock ownership. Export helpers once under one writer before parallel file work. Ordered AST lineage preserves97 original registration expressions, including callbacks/assertions/timeouts; focused runtime checks are not a complete165-case pass. Explicit per-file hooks and pending-call process-state custody are qualified; legacy assertion-failure/late-timeout retention remains a gap.
- [ ] Assign one writer per destination contour; move smaller independent groups first. Do not execute original and moved copies in the same phase.
- [ ] Update exact test-ID/association lineage and captured inputs; preserve scenario review/N/A status. Prove every original case appears once, no assertion loss and no shared mutable root/DB.
- [ ] Root qualifies changed contours once; blind reviews; publish. Admit parallel resource eligibility only after fixture/mocking independence controls.

Smallest domains extracted first: delivery5registrations/9expanded cases and
limits6/6, with one explicit cleanup registration per file. Complete
baseline registration AST union retains97expressions exactly once across the
original and both destinations, including callbacks/assertions/timeouts.
Repair phase and the mutation source-to-test partition include each destination
once. Generated association slices remain unreviewed until their owner checks
the new file/name identities; this does not admit private parallel eligibility.
Domain declaration order is retained; moving files changes cross-file ordering
and still requires the existing module/mocking resource review.

## Task5: Controlled comparison and expansion

**Files:** TESTING.md, .agents/skills/bun-test/SKILL.md, current plan/WORK and caller-owned timing evidence.

- [ ] Run bounded identical immutable captured selection serial then concurrency2 with distinct run IDs/disjoint outputs, including pure, private CLI/Host, failure/collision and ordering controls. Record real wall time, per-file/test tails, RAM/children/retained roots; no native speed claim from docs.
- [ ] Keep bounded synthetic-fixture pilot results explicitly untrusted/non-global. Reuse that owner; no partial selector may admit a current coverage report or manufacture numeric evidence.
- [ ] Stop on provenance/freshness/custody/resource regressions. Keep serial mode and no automatic retries of unknown operations. Increase workers only with useful measured benefit and stable bounds.
- [ ] One complete current parallel selection must pass and produce admitted report within600000ms. Fix actual failures and repeat only after concrete corrections.
- [ ] Existing final owner checks exact coverage, reviewed frozen budgets and assertion-confirmed mutation evidence. Update authoritative guidance and skill only for practices actually qualified; pending parts stay labeled pending.

Execution priority: qualify/publish already prepared diagnostic and custody
repairs first; implement tasks1–3 as one shared protocol contour with independent
tests/review, then task4 domain writers, then task5 expansion. This replaces a
naive `--parallel` flag change and duplicates no already-completed artifact reuse.
