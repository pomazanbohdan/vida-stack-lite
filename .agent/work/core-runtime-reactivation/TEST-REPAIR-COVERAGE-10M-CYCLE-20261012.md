# Test Repair and Coverage Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Root owns runtime verification; blind Luna workers own disjoint implementation files and independent reviews.

**Goal:** Reach a complete passing current test selection with exact coverage and frozen quality gates, within the user's ten-minute iteration ceiling.

**Architecture:** Retain Babel AST → function inventory → test links → reviewed scenario matrices, Ajv and the owned Bun coverage producer. Each iteration captures inputs once, streams its selected tests, records terminal evidence, fixes causal families, and publishes verified packets before the next full run. A partial or interrupted run never qualifies a global gate.

**Tech Stack:** Qualified Bun1.4.3, maintained TypeScript, existing Babel/Ajv/coverage/CRAP/mutation tooling; no new dependencies or orchestration framework.

**Spec:** HANDOFF-CLEAR-CLOUD-20261009.md, current packages/agent/TESTING.md, current WORK.md, and the user's explicit ten-minute iterative repair instruction on2026-10-12. Earlier recovery records are not current premises.

## Global Constraints

- Suite producer ceiling600000ms; default5000ms per individual test, existing justified case exceptions remain distinct.
- Exact100% functions/lines/statements/branches for every maintained source and aggregate; every mapped function must have valid execution evidence.
- Frozen complexity/CRAP correspondence and ceilings; never derive new ceilings from candidate failures.
- Mutation100% requires assertion-confirmed Killed; timeout, compile/runtime error and no coverage never count.
- Static association, execution, coverage, assertion, property and mutation evidence remain distinct; generated scenarios remain unreviewed and N/A requires rationale.
- One runtime/numeric owner, Root; one writer per file. Source/test/tool bytes and Git HEAD stay stable during full measurement.
- Preserve CAS, ownership, authorization, durable sync, UNKNOWN and no replay. No stale DB/lease/attempt restoration or archival UNKNOWN replay under another ID.
- Build/install never run suites. Preserve unrelated changes. Ordinary commit/push follows applicable verification and review.

## Review Focus

1. A malformed negative fixture must not substitute schema failure for its intended policy/UNKNOWN denial.
2. A Source connection closing must also release its exact hidden admission gate.
3. Parent timeout must not claim body/descendant termination, successful cleanup or numeric admission.
4. Immutable snapshot reuse must not cross a current Source/authorization/CAS boundary.
5. A fast partial selection must not substitute for the complete current selection or hide uncovered functions.

## Ownership and schedule

Root keeps this plan and WORK ledger, observes the one producer and performs qualification/publication. Up to six useful blind Luna jobs analyze separate causal families or write disjoint files after the producer terminates. Reviews do not rerun verified suites. Shared helper changes have one designated writer.

Ruling: parallel independent writers are authorized by the user's explicit dispatch requirement; shared files remain single-writer. Existing authorization includes autonomous implementation and ordinary push, so this plan adds no approval pause. No duplicate full suite, AST/scan/hash pass or unchanging full rerun is added.

### Task1: Iteration producer and evidence custody

**Files:** packages/agent/tooling/run-bun-coverage.ts; tests/coverage-runner-lock.test.ts; tests/coverage-run-custody.test.ts; packages/agent/TESTING.md.
**Interfaces:** Existing coverageInputs, RunManifest, ChildOutcome and exact acquire/releaseCoverageRunLock predicates; no new report schema.

- [x] Set explicit600000ms producer timeout, preserve CLI5000ms, inherit stdout/stderr without64MiB buffering.
- [x] Verify real reaped-timeout/no-start/foreign-lock controls:13 PASS/97 assertions, no UNKNOWN reinterpretation.
- [x] Publish dbfa40c; start fresh full selection with TMPDIR outside editable target.
- [x] Record terminal outcome and partial rows independently from admitted final report. Iteration dbfa40c hit600000ms:77PASS/8FAIL, UNKNOWN, no coverage receipt; exact reservation released. Existing failed-root deletion in controller test discovered and repaired separately.

### Task2: Causal triage and fixture coherence

**Files:** packages/agent/tests/runtime-config-rebind.test.ts; tests/development-controller.test.ts; tests/audit-core-regressions.test.ts; their existing fixture helpers.
**Interfaces:** validateCoordinationLedgerV1, existing public run/prepare/issue/resume, existing controlled phase timing.

- [ ] Separate fixture invalidity, product failure, setup/child timeout, slow body, custody and stale artifact/binding gaps using exact log evidence.
- [x] Fix the distinct released-ticket negative fixture: allocate ledger.next_sequence, increment it, assert ledger validity before persistence; preserve pending/unknown denial and whole-database equality.
- [x] Root qualifies that denial with adjacent coherent older-history positive control:2PASS/30assertions,3698.05/3710.89ms; no regex widening.
- [ ] Attribute controller qualification and audit startup timeout phases before optimizing. Do not cache an entire qualification or suppress current-state proofs.
- [ ] Review each causal packet independently, static-check, focused-qualify, commit and push.

### Task3: Resource closure and slow-case refinement

**Files:** Existing admitted-DB test fixture owners and automatic-work-absorption.test.ts.
**Interfaces:** closeWorkspaceDatabaseWithAdmission; owning fixture/store/ledger close methods; existing complete workspace snapshots.

- [x] Native fresh control proves raw close retains gate FD and owner wrapper releases it; exact close repairs published in ten test files.
- [x] Audit remaining exact admitted handles in bun/host-state.test.ts: WeakSet tracks exact admitted parent handles, raw/ledger-owned close semantics stay unchanged; close/reopen control1PASS/5assertions322.29ms.
- [ ] Profile the original-entries/restarted-retry absorption case before removing work. Keep full-workspace no-effect proof; a scoped Host/work snapshot is not an equivalent replacement.
- [ ] Repair failed-root custody only through an owner that distinguishes body completion from timeout and retains uncertain artifacts; no new generic lifetime framework without evidence.
- [ ] Qualify actual positive/negative/cleanup behavior; never raise a deadline only to make a slow case green.

### Task4: Coverage-directed file ownership and assertion strength

**Files:** Existing function inventory/test association/scenario tooling and mapped packages/agent source/test files.
**Interfaces:** Existing function ID, scenario ID, test ID and source/tests/config hash bindings.

- [ ] Once a complete current suite is terminal and admitted, rank missing function/branch/assertion scenarios by shared causal contour, smaller files first.
- [ ] Assign each file to one writer; reuse the captured inventory and current scenario matrices, add boundary/negative/state/property assertions only where the contract needs them.
- [ ] Review generated scenarios explicitly; preserve independent evidence categories and N/A rationale.
- [ ] Requalify changed contours once, publish; launch one new full current coverage producer after the batch, not one per worker.

### Task5: Frozen numeric closure and bounded convergence

**Files:** Existing coverage-gate.ts, crap-gate.ts, quality-final.ts, mutation evidence owners and approved baseline-plan work records.
**Interfaces:** Current validated coverage receipt, genuine b549951 baseline evidence and reviewed exhaustive correspondence; existing assertion-confirmed mutation classification.

- [ ] Resolve the absent default frozen CRAP budget plan through genuine evidence/exhaustive reviewed correspondence; missing/partial plan remains GAP, no invented ceilings.
- [ ] Run exact coverage/CRAP/mutation admission sequentially under Root; reuse current receipts only when every binding remains current.
- [ ] Record producer and end-to-end command durations separately. Fix measured setup/I/O/teardown costs without weakening fsync, quarantine, freshness or assertion strength.
- [ ] Repeat tasks2–5 after a concrete fix batch; never repeat identical input just to seek a greener outcome.
- [ ] Finish only when all current tests pass, exact four-metric coverage and frozen gates pass, assertion-confirmed mutation score is100%, and the complete test/coverage flow finishes within10minutes. Explicitly retain any pending target-platform/runtime qualification.

## Current ledger

dbfa40c is published. Its iteration log is .tmp/coverage-iteration-dbfa40c/full-coverage.log; result UNKNOWN with77PASS/8FAIL partial rows. The prior1800s attempt is UNKNOWN with121PASS/19FAIL and no coverage receipt. Neither is a global gate pass.

Next packet: malformed-process-output parser controls3PASS/7assertions; controller opt-in start/settled diagnostics cover setup and public calls, parent62function complexities unchanged. Fresh controller controlsPASS17assertions at27.55s and31.07s command; diagnostic receipts retained in workspace before exact verified successful fixture cleanup. Setup~0.8s, largest issue-wave~6.1s in that fresh tmpfs control; workspace full measurements are not a matched benchmark. Further Source/runtime-package cost attribution remains open, no safe freshness shortcut admitted.
