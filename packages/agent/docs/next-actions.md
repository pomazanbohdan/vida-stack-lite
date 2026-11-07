# Runtime next actions

Owner: runtime maintainers. Updated: 2026-11-07.
Class: derived task queue. The [system specification](system-specification.md),
[development lifecycle](../instructions/development-lifecycle.md) and
[testing policy](../TESTING.md) retain their contract ownership.

## Active implementation

This is the canonical Agent queue. The
[runtime product model implementation plan](plans/runtime-project-model.md)
contains scope, acceptance and evidence for these same tasks, not another queue.
Follow the [one-task runtime-first delivery cycle](decisions/work-items/runtime-first-development.md).

| Task                                                                                                                                            | Current state                                  | Remaining outcome and dependency                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Task 3, clean-init effect owner](plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner)                                  | v0.1.13 installed; local owner closeout open   | Persist actual terminal and published-artifact evidence through the existing release owner. C3 and R17/R18/R19 corrections are published and installed; both old Source claims were captured. Real init and Runtime acceptance remain open.                                                        |
| [Task 4, config/context adoption and Codex identity](plans/runtime-project-model.md#task-4--configcontext-adoption-and-codex-identity)          | Old claim settled; synthesis review pending   | Complete serializable public v1/v2 types, configuration codecs, exact-byte adoption and journal/CAS/resume; fix selector matching, integrate causal receipt/path/preservation callers and registration, and explicitly convert `plugin` to `codex` without rewriting history.                        |
| [Task 5, interactive init/config/help and package parity](plans/runtime-project-model.md#task-5--interactive-initconfighelp-and-package-parity) | Old claim settled; component ready            | Retain the four-file component and Root corrections. After Task 4 adapter delivery, integrate init/configure handlers, prompts, help, resources and package registration. Complete actual product/path setup and Source/native parity.                                                             |
| [Task 6, full-model qualification and repository adoption](plans/runtime-project-model.md#task-6--temporary-end-to-end-acceptance-and-delivery) | Waiting for delivered Tasks 4 and 5            | Qualify the complete model in a temporary consumer, then perform the approved real init and verify products, documentation and preserved work. Attribute workflow evidence and user Runtime acceptance separately.                                                                                 |

Release, installer verification and Markdown reconciliation are completion steps
of each task's cycle. They are not additional implementation tasks or a reason
to postpone Task 3 delivery until Tasks 4–6 finish. After verified real init,
reconcile and continue still-current work through the updated installed runtime,
as the user directed on 2026-11-04.

Task 4's retained parser/adapter/context evidence has 53 focused passing cases;
the full versioned adoption operation remains incomplete. Task 5's independently
reviewed Root-corrected input/prompt component has retained 17-case/65-assertion
evidence. These are working-tree components, not delivered tasks or completed
repository setup. The four Task 5 files remain uncommitted until their real
callers consume the exported types and the normal hook accepts that integration.

Both old Source claims are settled through installed `0.1.13`'s public capture
owner. Task 4 was captured first. Task 5 then used fresh shared CAS after the
legitimate disjoint Task 4 continuation changed Ledger. Each applied request had
three fresh independent passing exact reviews and Root authorization. Closed
post-inspections show lease `null`, pending `0` and recovery `false` for both.
Capture records reported-failed/partial-stopped work and releases only old rights;
it establishes neither task completion nor a successor Source grant.

The R19 correction replaces the global inspector's direct run-ID equality with
the existing `validateWorkSessionBinding` after unchanged integrity checks. Its
bounded Source/Code/tester results and corrected Source-handoff were accepted.
Retained proof has three cases/260 assertions across two processes, scoped
statics and independent reviews. Primary tests-project types still retain three
diagnostics in two Task 4 files; whole numeric qualification remains separate.
R19 is delivered in `0.1.13` and its ordinary continuation admitted the real
Task 4 completion work. It is not another active feature task.

The current Task 4 work is
`.agent/work/runtime-product-config-v2-finish-20261107-task4-r3/`.
Its execution-only intake covers the existing partial delta plus causal
init-core receipt, clean-init protection and direct versioned path/component
seams. No Source writer is issued yet. The accepted schema/adapter contract stays
canonical; implementation, checks/review, main integration and Task 4 delivery
remain required before Task 5 integration. Earlier failed reviews, superseded
CAS packets, UNKNOWN effects and original journals remain in the work store.

The configured Luna/xhigh synthesis completed. Its original report exceeds the
word budget and remains unchanged; a separately attributed Root projection meets
that budget. The pre-Source map freezes 1,777 callable rows, including 1,062
production rows, against 336 baseline rows. The 741 unpaired roles have prospective
10/10 caps; proposed correspondences still require review and numeric results
remain unmeasured. The independent Devin review could not start because its
provider executable is unavailable. Review, native prewrite and actual Source
issuance remain pending; no alternate model or passing review is inferred.

## Current delivery state

Published and installed current runtime is
[v0.1.13](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.13).
It contains C3, R17/R18 and R19. R19's reviewed Source and queue reached
[main b4bb0b1d](https://github.com/pomazanbohdan/vida-stack-lite/commit/b4bb0b1d763adface6f9a325b77b43d2c10ab182);
the owner-selected version reached
[main 1a7a902c](https://github.com/pomazanbohdan/vida-stack-lite/commit/1a7a902c379504da86dedbe8be48b290268d9f43).
Normal hooks passed formatting/type/lint and the Windows profile's 122 cases.
Primary and release-tree WIP were preserved; this is not whole-product proof.

The existing release owner selected `0.1.13` after its own fresh all-nine
`0.1.12` baseline readback and CAS. One native workflow was dispatched:
[CI run 42384133330](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/42384133330).
Assurance and both original producers passed. Two publication readback failures
left the exact tag, then the exact empty draft. Each failed-job recovery followed
fresh matching-state reconciliation of that same operation and original producer
claim; no new dispatch, rebuild, tag overwrite or manual asset replacement.
Attempt 3 succeeded, including public publication and external Linux installation.
Original failures remain retained.

The maintained public Windows installer updated to `0.1.13` without Source
override, closed exit 0 and returned matching immutable artifact bytes with cleanup
complete. Its structured result owns that postcheck. Public native identity and
instruction lookup were then used for actual capture binding. The delivered R19
inspector and both supported old-claim captures succeeded on this runtime.

The release checkout's manifest is `0.1.13`; primary working manifest `0.1.9`
remains preserved WIP. Local release journals, including the selected operation's
`awaiting_assurance`, retain their own existing closeout owner. Public publication
and installation do not rewrite those journals. Actual project init and user
Runtime acceptance remain open.

Published main now contains the I-1 guard supporting `vida-agent` and legacy
`packages/agent`. Its earlier main/release divergence is reconciled. Do not open
another guard implementation task.

Evidence: `.agent/work/init-main-integration-20261107/` retains predecessor
delivery, protected-WIP reconciliation and capture records; its
`capture-evidence-audit/capture-native-v013-r1/task4/` and
`capture-evidence-audit/capture-native-v013-r2/task5/` retain exact authorization/apply receipts and
fresh post-inspections. R19 formation/install belongs to
`.agent/work/runtime-corrective-workspace-inspection-20261107-r19/release-next-r1/`.
Historical failed/superseded packets grant no new rights and are not replayed.

## Completed dependencies and merged queue entries

- Task 1's catalog/product-model Source is an integrated dependency.
  Active configuration adoption belongs to Task 4, not another Task 1.
- Task 2's work-record Source and readonly-frontier repair are delivered in
  [v0.1.9](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.9).
  Its original attempt retains its supported suspended disposition, without
  retrospective runtime completion or user acceptance.
- C1/C2/C3 and corrective proof runs belong to Task 3, not separate active
  feature tasks. Their original FAIL/UNKNOWN/NOT_READY remain intact.
  The R13 readonly-prewriter close correction is delivered in `0.1.11`.
- R17 stopped-Source capture and R18 release-readback corrections are Task 3
  delivery prerequisites, now included in published and installed `0.1.12`.
  Their bounded Code and delivery evidence do not establish whole-product
  qualification or Runtime acceptance. They are not new active feature tasks.
- The former governed-installed-runtime-session entry is part of Task 6's
  attributable workflow and acceptance checks. Reuse matching evidence;
  do not register the same scenario twice.

## Remaining work outside the implementation plan

### Qualify installation recovery and offline resource discovery

Verify Windows rollback through the maintained installer owner, with exact
artifact bytes and structured native observations. Check first-run resource
discovery from another cwd with external runtimes absent and exercise the
required offline boundary. Reuse matching Task 6 evidence for shared scenarios.
Preserve ambiguous installer/process effects for their reconciliation owner.

Completion: each claimed recovery/offline path has attributable native evidence.

### Close whole-product development-quality debt

Rebind whole-product coverage, frozen CRAP and mutation qualification to current
Source under the existing policies and budgets. Preserve the distinction between
focused implementation checks and whole-product qualification. Retain the
unwaived Windows file-symlink EPERM and unresolved timeout/closure and SDK-lock
custody until their applicable evidence closes them.

Qualify outstanding Windows filesystem physical races, adversarial scheduling
and native failure/close injection. Establish isolated producer evidence before
increasing test concurrency.

Completion: current reports close the applicable numeric and custody criteria.
These tasks retain their existing gate scope under TESTING and the lifecycle.

## Evidence custody

Historical records, FAIL/UNKNOWN, backups, operation journals and native fixture
roots retain their original bindings and recovery owners. Removing a duplicate
or obsolete queue entry changes documentation only. It does not settle,
supersede, delete or authorize replay of a persisted runtime operation.
Attributable user testing remains required for Runtime acceptance.
