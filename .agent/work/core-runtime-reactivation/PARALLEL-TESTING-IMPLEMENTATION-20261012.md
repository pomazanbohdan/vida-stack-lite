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

## Task3: Async direct-producer supervision and global budget

**Files:** run-bun-coverage.ts, package.json test:coverage:pinned command and existing bounded-subprocess / coverage-run custody owners and tests. Same protocol writer owns runner; a separate writer may own disjoint adversarial tests.

**Interfaces:** Reuse exact current terminal/reservation predicates. `runCoverageShards(plan:CoverageShardPlan, capturedInputs:Awaited<ReturnType<typeof coverageInputs>>, deadline:MonotonicCoverageDeadline):Promise<CoverageShardOutcomes>`. `MonotonicCoverageDeadline {started_ns:bigint; expires_ns:bigint}`; `CoverageShardOutcomes {outcomes:readonly (ChildOutcome & {producer_pid:number|null; producerTerminalKnown:boolean; directProducerAccounted:boolean; resourceSafeToAdvance:boolean})[]; reservationSafeToRelease:boolean}`. The run-level release predicate requires every launched producer accounted under existing exact rules; an unknown sibling holds the shared lock. Not-started accounts for its launch alone. Root releases the one acquired handle once, never from a per-shard outcome. Keep direct producer reservation release separate from reviewed resource/descendant/effect quiescence. ChildOutcome keeps current fields; no success from PID absence. Command-entry deadline precedes required typecheck/preparation; concurrency initially2. Typecheck moves into the existing runner owner, removing the shell pre-step, not adding a duplicate scan.

- [ ] RED controls: two real marker producers overlap; deadline exhausted before launch; timeout with sibling active; ordinary nonzero; crash/missing receipt; known direct exit with live descendant; signal/late output; no-start versus unknown spawn.
- [ ] Replace synchronous launch for current parallel mode with bounded async direct children, explicit paths,5000ms default, per-shard streamed logs and existing cleanup/report reserve semantics. Account every launched sibling; retain uncertain roots and operations.
- [ ] Enforce ordered waves: no overlap with singleton exclusive waves. A successor needs resourceSafeToAdvance evidence, never merely direct child PASS/exit, released reservation, absent PID/marker or issued signal. Missing evidence retains UNKNOWN and stops successors. Clamp nested CRAP's300000ms cap to the remaining command deadline; qualify spent preparation/typecheck/report allowance and unchanged lock behavior.
- [ ] Zero/spent allowance forbids launch (never native timeout0); record unattempted evidence and preserve custody.
- [ ] Preserve original serial/historical path. Root runs bounded real child controls; reviewer audits failure/UNKNOWN/release behavior; publish.

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

**Files:** tests/runtime-config-rebind.test.ts; new tests/runtime-config-rebind-source.test.ts, runtime-config-rebind-delivery.test.ts, runtime-config-rebind-readonly.test.ts, runtime-config-rebind-history.test.ts, runtime-config-rebind-limits.test.ts; shared tests/helpers/runtime-config-rebind-fixture.ts; package.json phase membership and test associations.

**Interfaces:** Preserve existing fixture constructors/inspection types as a test-helper module; every invocation creates fresh owned state. Keep exact test names, assertions, case bounds and operation IDs. Retain source-policy/mutation semantics; no new product seam.

- [ ] Capture case identities/cardinality from existing inventory/selection before moves; identify fixture-global mock/clock ownership. Export helpers once under one writer before parallel file work.
- [ ] Assign one writer per destination contour; move smaller independent groups first. Do not execute original and moved copies in the same phase.
- [ ] Update exact test-ID/association lineage and captured inputs; preserve scenario review/N/A status. Prove every original case appears once, no assertion loss and no shared mutable root/DB.
- [ ] Root qualifies changed contours once; blind reviews; publish. Admit parallel resource eligibility only after fixture/mocking independence controls.

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
