# Parallel Testing Implementation Plan

**Goal.** Qualify a bounded parallel test operation without weakening complete test selection, evidence custody or numeric gates.

**Architecture.** One lead captures inventory, inputs and maps. The initial target is two direct serial Bun children under one supervisor and one deadline. Resource-conflicting tests remain in exclusive waves. One validator performs the checked global merge. Current and historical production stay serial until all activation gates pass; historical baseline execution remains serial thereafter.

**Owners.** Root owns shared protocol and Source, runtime/compiler checks, final numerical evidence and publication. Each writer owns disjoint files. Workers do not run competing checks or recapture/hash/parse shared inputs. Build and install run no suites.

**Sources.** The normative test policy is [TESTING.md](../../../packages/agent/TESTING.md). The design contract is [PARALLEL-TESTING-DESIGN-20261012.md](PARALLEL-TESTING-DESIGN-20261012.md). The test repair cycle plan owns its separate repair queue.

## Current state — 2026-10-14

The latest complete current run ended UNKNOWN after both accounted direct producers received SIGKILL. It admitted no numeric report. Partial reporter rows do not establish full-selection success, coverage, CRAP or mutation qualification. Do not repeat an unchanged full run.

The bounded scheduler, versioned shard evidence primitives, checked sparse merge and bounded one-or-two-producer supervisor have scoped structural/native controls. These foundations do not activate parallel production. A native two-child pilot qualifies mechanics only.

The current production command remains serial. Full production output-role custody, complete shard receipt admission, broader package-reader eligibility, descendant/effect quiescence and resource-safe successor proof remain open. The five-minute command budget and 30-second terminal/report reserve remain fixed. No numeric gate or resource advancement has passed.

Next work closes the concrete package-reader caller/overlap and resource-quiescence questions, then integrates the already-qualified bindings. Run one complete current selection only after the concrete correction and its affected checks are ready. Preserve UNKNOWN roots and do not automatically retry uncertain operations.

## Global constraints

- The pinned current operation has a 300000 ms total deadline, including typecheck, preparation and report work. Keep the 30000 ms terminal/report reserve inside it. Each test keeps the 5000 ms default unless its existing contract justifies an exception. Clamp nested CRAP time to the remaining command budget. Mutation remains a separate manually authorized operation.
- Final acceptance requires exact 100% function, line, statement and branch coverage; frozen one-to-one CC/CRAP correspondence; and 100% assertion-confirmed Killed mutants. A pilot or partial result cannot satisfy these gates.
- Capture inputs, inventory and maps once. Reuse their bindings. Prepare once and perform one canonical final validation. Do not add per-worker scans, duplicate suites or a second merge.
- Preserve source/test/config freshness, CAS, authorization, ownership, durable sync, UNKNOWN/no replay, failed-root custody and exact reservation predicates.
- Keep serial v2 and historical v1 readers compatible. Historical single-process and JUnit reference behavior stays serial.
- Do not edit observed inputs during a measurement. Root alone owns final qualification and repository publication.

## Review focus

1. Missing or duplicate shard evidence cannot hide behind aggregate counters.
2. A passing sibling cannot mask a crashed producer or surviving descendant.
3. A per-shard timeout cannot reset the global deadline.
4. Exclusive resources must constrain scheduling, including shared outputs and hidden module or mock dependencies.
5. Domain extraction preserves every case, assertion, timeout, fixture owner and scenario identity.

## Task 1: bounded scheduler and immutable assignments

**Status: scoped scheduler work complete.** Structural controls cover exact selected union, default-exclusive unknown files, duplicate/foreign paths, stale review bindings, stable ties, resource bounds and exclusive barriers. The scheduler does not activate production parallelism.

**Contract.** `planCoverageShards` consumes already-captured `InputDigest` rows and reviewed test-resource rows. Each review binds the exact test digest and current review-scope digest. A stale or missing review makes the file exclusive. Assignments contain explicit selected paths and a selection digest. A shared resource cannot appear in two assignments in one wave; same-resource tests stay serial in one assignment. A global-exclusive file overlaps no assignment. Initially, eligible waves contain at most two assignments.

**Review rule.** Do not recapture, rehash or rebuild inventory in the scheduler. Use stable path/index ties. Partial reporter rows are not duration weights. Source, dependency, provider or execution-scope changes invalidate the review binding.

## Task 2: versioned shard evidence and checked merge

**Status: primitives have scoped controls; production integration remains open.** Serial production remains v2/v1. The v3 run and v2 child schemas must remain distinct from the serial schema.

**Contract.** Bind the assignment plan, shard ID, exact assigned tests, shard selection digest, argv, cwd, environment and captured inputs. Give every shard disjoint coverage, JUnit, log, receipt and temporary outputs. Reject output aliases or writes into immutable snapshots/maps. Keep the global manifest's complete test selection. Each child may report sparse source maps, but every reported key needs that child's captured load evidence. Validate nonnegative safe-integer counters and exact selected union, then seed and merge once against the complete canonical Source domain.

Require one terminal/receipt join for every shard. Missing, duplicated, stale, sibling, foreign or incomplete evidence denies admission. Preserve legacy serial readers and historical single-process references. No historical parallel mode is authorized.

## Task 3: bounded producer supervision and resource advancement

**Status: supervisor and native fixture mechanics have scoped controls; current production binding and resource-safe advancement remain open.**

**Interface.** Reuse `ReturnType<typeof executionBudget>` and the existing exact terminal/reservation predicates. Prepare producer argv, cwd, environment and optional duration before launch. The supervisor accounts every attempted launch and reports direct terminal/error observations. A not-started result applies only to that launch. One shared lock is released once by the run owner after all launched producers satisfy the existing accounting rule. Direct producer termination is separate from measurement success and resource/descendant/effect quiescence.

**Required controls.** Cover overlapping native marker children, spent budget before launch, timeout with a sibling active, nonzero exit, crash/missing receipt, signal/late output, known direct exit with a live descendant, and exact no-start versus unknown spawn. Stream per-shard output and retain uncertain roots. Nested launches use remaining parent allowance; zero allowance never becomes native timeout zero.

A successor wave requires separate reviewed `resourceSafeToAdvance` evidence. Child PASS/exit, released reservation, absent PID/marker or issued signal does not prove quiescence. Keep serial and historical launch semantics intact. The native pilot is not production activation or numeric evidence.

## Task 4: package-reader eligibility and test domain extraction

**Status: the verified package-only adapter and selected callers have focused evidence. Broader caller closure, shared-resource removal and effect quiescence remain open.**

Package-owned immutable resources may use the existing verified-capture primitive. Preserve identity, bounds, active CAS/recovery denial, strict decoding, schema/template digests and original errors. Mutable consumer readers remain unchanged. Keep the canonical physical package-owner digest in resource IDs. Until every reader and writer sharing that resource is reviewed, retain the common conflict tag.

For test-file moves, capture original registration identities/cardinality first. Move each case once. Preserve names, callbacks, arguments, assertions, timeouts, fixture cleanup, mutation lineage and package phase membership. A focused move or overlap control does not establish complete case coverage or parallel resource eligibility. Review module/mocking state and cross-file ordering before removing a conflict.

## Task 5: controlled comparison and expansion

**Status: pending.** Only after tasks 1–4 and all activation prerequisites pass, compare identical immutable serial and concurrency-two selections with distinct run IDs and outputs. Include pure, private CLI/Host, failure/collision and ordering controls. Record complete wall time, per-file tails, memory, child outcomes and retained roots. Do not claim speed from partial reporter rows or instrumented time.

Stop on provenance, freshness, custody or resource regressions. Keep serial fallback and do not automatically retry UNKNOWN runs. Expand concurrency only after useful measured benefit and stable bounds. One complete current parallel selection must pass and admit its report within 300000 ms. The existing final owner separately evaluates exact coverage, frozen budgets and assertion-confirmed mutation evidence.
