# Runtime next actions

Owner: runtime maintainers. Updated: 2026-11-09.
Class: derived task queue. The [system specification](system-specification.md),
[development lifecycle](../instructions/development-lifecycle.md) and
[testing policy](../TESTING.md) retain their contract ownership.

## Active implementation

This is the canonical Agent queue. The
[runtime product model implementation plan](plans/runtime-project-model.md)
contains scope, acceptance and evidence for these same tasks, not another queue.
Follow the [one-task runtime-first delivery cycle](decisions/work-items/runtime-first-development.md).

| Task                                                                                                                                            | Current state                                | Remaining outcome and dependency                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Task 3, clean-init effect owner](plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner)                                  | v0.1.13 installed; local owner closeout open | Persist actual terminal and published-artifact evidence through the existing release owner. C3 and R17/R18/R19 corrections are published and installed; both old Source claims were captured. Real init and Runtime acceptance remain open. |
| [Task 4, config/context adoption and Codex identity](plans/runtime-project-model.md#task-4--configcontext-adoption-and-codex-identity)          | v0.1.14 published and installed              | Delivery prerequisite for Task 5 is met. Preserve seven LibSQL cleanup failures and numeric/broader recovery qualification debt; installation is not Runtime acceptance.                                                                    |
| [Task 5, interactive init/config/help and package parity](plans/runtime-project-model.md#task-5--interactive-initconfighelp-and-package-parity) | v0.1.15 installed; native init blocked       | Correct the omitted raw clean-init helper resource exposed by the delivered temporary consumer. Requalify complete native init/configure after the scoped package correction; retain the failure.                                           |
| [Task 6, full-model qualification and repository adoption](plans/runtime-project-model.md#task-6--temporary-end-to-end-acceptance-and-delivery) | Temporary consumer exposed package defect    | Complete delivered consumer qualification, then use the supported bound-Host adoption owner for the approved model and plugin-to-codex map. Preserve existing data/docs/work and user-attributed Runtime acceptance.                        |

Release, installer verification and Markdown reconciliation are completion steps
of each task's cycle. They are not additional implementation tasks or a reason
to postpone Task 3 delivery until Tasks 4–6 finish. After verified real init,
reconcile and continue still-current work through the updated installed runtime,
as the user directed on 2026-11-04.

Task 4 now implements serializable public v1/v2 dispatch, full-model configuration
request/plan/operation, exact-byte receipt and journal/CAS/resume binding, init-core
and clean-init preservation, explicit identity mapping and segment-aware selectors.
Both current Code validators passed. An independent focused tester executed
22 cases/122 assertions with no failures; Root reproduced that result on the
integrated release target. The older 53-case parser evidence remains historical.
Task 5 now wires that pure input/prompt component through bounded JSON/YAML
`--product-model`/`--input`, missing-value terminal completion, init forwarding,
strict v1/v2 configure plans and help/resource registration. Its accepted Code
fingerprint is `6c1499eee333c78e9c4dd5d670a67667b785add95c26f7a69f75b63caad187cd`.
A distinct tester executed 49 cases/203 assertions, 23 legacy-adapter cases/94
assertions and three help/resource cases/61 assertions, all passing; strict test
types passed 586 files with zero errors. The work record is
`.agent/work/runtime-product-setup-cli-20261108-task5-r5/`. Source handoff is
accepted. Root integrated the exact 20-path assembly on main as `d1cc2251` through
normal hooks. The second normal push passed all 122 Windows cases; the first
retained push failed one unchanged five-second process-custody test. Public
0.1.15 formation, publication and installation passed, but delivered init failed
before creating integration files because `bin/consumer-clean-initialization-v2.ts`
is missing from its raw helper payload. The temporary root retains only its
precreated product directories. Root's private Source consumer pass does not
replace this delivered failure. Real repository init remains unperformed.

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
statics and independent reviews. The later v1/v2 fixture corrections remove the
remaining tests-project type diagnostics; whole numeric qualification remains
separate.
R19 is delivered in `0.1.13` and its ordinary continuation admitted the real
Task 4 completion work. It is not another active feature task.

The current Task 4 implementation and accepted Code/tester observations belong to
`.agent/work/runtime-product-config-v2-finish-20261107-task4-r4/correction-r2/`.
Its implementation fingerprint is
`64683ff622fb2b1c74e83ce714b0132d4ea52b5b5d5b1691430531da580dee94`.
Actual Source issuance and Root-authored corrections supersede the earlier
planning-only state. The user authorized Luna as an independent-review substitute;
Devin availability is no longer a blocker. Earlier FAIL/UNKNOWN, expired packets,
and journals remain retained without granting new rights or Runtime acceptance.

The bounded fixture prerequisite is
`.agent/work/runtime-product-v2-static-fixtures-20261108-r2/`.
Its eight test/helper changes remove all 13 selected legacy diagnostics while
preserving v1/v2 helper behavior, test oracles and timing bounds. Both Code views,
the independent focused tester and the Source-handoff observation passed.

The formerly withheld YAML fixture is now repaired through
`.agent/work/runtime-product-v2-yaml-fixture-20261108-r1/`. The user changed
LeanCTX settings in their own terminal; normal ctx_read then supplied the file.
One explicit v1 guard in the portable test helper removes its eight diagnostics
without changing production/API, assertions or time limits. Physical Source,
both Code views, focused independent tester and Source-handoff are accepted.
Strict test types pass on primary (582 files) and release target (578 files).
Independent YAML authority selection passes 15 cases/110 assertions; Root's
configured-root read-only identity case passes separately (one case/two assertions).
The complete YAML file remains CLOSED_FAIL: 82 pass/seven LibSQL smoke
close/cleanup EBUSY or error-shape failures. Their baseline and causality are
unproved; no whole-suite or whole-Static PASS is inferred from the type repair.

Root integrated the 32-path Task 4/fixture/schema/plan candidate, this queue
and the YAML correction as 34 paths. The normal commit hook first refused new
unused exports. The causal three-file closeout removes only an unconsumed new
wrapper, keeps the consumed product-path collector and public configuration
union, privatizes two new component interfaces and narrows the YAML parser input.
Its Source/Code observations, independent 22-case/122-assertion tester and
Source-handoff are accepted under
`.agent/work/init-product-model-hook-closeout-20261108-r1/`.

Target commit `71d0950f049ba6a46759db6fc1c7ece9187f9f27` contains all 34 paths.
Normal pre-commit passed Knip, formatting, typecheck (617 files) and lint.
The other 31 staged blobs and primary index were preserved. Primary main and the
release branch contain merge `48951983`, which reconciles the current queue.
All 34 primary Source file bytes and 48 unrelated tracked WIP paths were preserved;
73 unrelated untracked paths and the original scoped stash remain retained.
Normal push closed successfully and origin/main was verified at `2c1727dd`.
The Windows push profile passed all 122 selected cases with no skips or failures.
The release owner then completed its fresh all-nine published `0.1.13` baseline
readback and selected candidate `0.1.14`, operation
`local-831586e9-9827-4673-b85d-d135d8c3de4f`, at `awaiting_assurance`.
Its manifest update is version-only; the predecessor journal and primary `0.1.9`
WIP are unchanged. That preparation record remains at its own local closeout
boundary; subsequent public formation/publication and installation are recorded
below and do not rewrite its journal.

The version commit reached main as `cd3e835f`; its normal Windows push profile
again passed all 122 cases. The single native
[CI42478472372](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/42478472372)
passed release assurance but both producers failed at native-build and publication
failed. That failed run established no installation. The root cause was a duplicated raw
dist/product-model schema entry plus omitted C3 clean-init-v2 resources in the
manifest. The manifest-only correction has accepted Source/Code and independent
inventory proof (one case/10 assertions plus raw uniqueness/coexistence).
Evidence belongs to `.agent/work/runtime-product-publication-inventory-20261108-r1/`.
Root retained that failure and reconciled the manifest correction through normal
hooks as `8dca4fd440e1b9744027a5508fbb44b001d55ff7`. Corrected
[CI42483708460](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/42483708460)
passed assurance and both native producers. The first publisher attempt left the
matching immutable tag and empty draft; exact-state reconciliation preceded one
failed-job recovery using the original producer artifacts. Attempt 2 published
successfully and passed external Linux installation. Windows update and cleanup
completed through the maintained public installer without Source override.

The user explicitly approved every value in
[the setup model](decisions/configuration/project-config.proposed.yaml) on
2026-11-08, including wiki/requirements/store paths for all three products.
This removes the path-approval gap; no automatic activation, migration or
Runtime acceptance is implied.

Coverage/CRAP, reviewed final callable correspondence, manual mutation, full-suite,
Host/C3 recovery, v2 physical relocation and lost-ack/restart qualification remain
unproved under unchanged policy. The historical composite timeout and 2 s target
are not qualified by focused passes. Task 5's broad legacy campaign retained
68 passes/29 failures, including stale expectations subsequently corrected,
five-second init timeouts, Windows symlink EPERM, unowned clean-init direct-help
and stale SDK receipt failures. Direct primary Knip retains zero code issues and
one redundant entry hint in unchanged `knip.config.ts`; the actual integrated
target's normal staged hook passed strict Knip without changing that config.
Physical PTY launch was denied before process creation, so scripted questions do
not establish physical TTY/SIGINT behavior. No limits or checks were weakened.
Qualify a complete delivered temporary consumer before real repository init.
Approved document destinations are not active configuration.

## Current delivery state

Published and installed current runtime is
[v0.1.15](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.15),
Source `d1cc225121a9c7d9dcbe9a1755f7788dce234c1a`.
[CI42534601541](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/42534601541)
passed assurance and both producers. Its first publisher failure left a matching
immutable tag and empty matching draft. Exact remote inspection preceded one
failed-job recovery of the same run using the original artifacts; publication and
external Linux install then passed. GET-only readback verified all nine assets.
The maintained Windows update returned version 0.1.15, 161274368 bytes and SHA256
`4aa7ef0b35f86476ef15b04b5fe95534ec2f8a1666600b015216e41b8f4f738d`,
cleanup complete and effective PATH confirmed once. No Source override was used.
Evidence belongs to `.agent/work/runtime-product-setup-cli-20261108-task5-r5/`.
Installed version/help pass, but its actual full-model temporary init fails on an
omitted raw helper import before creating config, receipt or AGENTS. Installation
therefore does not establish complete Task 5 functional qualification. The package
closure correction now has accepted Source/Code/independent tester and Source
handoff in `.agent/work/runtime-native-init-resource-closure-20261109-r1/`: four
existing raw C3 helpers added to the manifest, zero callable-body changes, 62
modules with no missing raw-bin imports, two SDK cases/44 expect calls and scoped
formatting. Root is integrating it for the next owner-selected PATCH. No actual repository init or
attributable user Runtime acceptance exists.

The preceding v0.1.13 delivered the stopped-source and workspace-inspection
corrections. R19's reviewed Source and queue reached
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

The release owner verified the complete published `0.1.14` baseline and selected
Task 5 candidate `0.1.15`, operation `local-a153c79d-39ee-4649-add5-3d4306357eca`,
at `awaiting_assurance`. Its version-only manifest change and unchanged predecessor
are recorded in `.agent/work/runtime-product-setup-cli-20261108-task5-r5/prepared-release.json`.
That preparation remains historically distinct from the subsequent public
publication and installation recorded above.

After complete all-nine 0.1.15 readback, the existing release owner selected
0.1.16, operation `local-95cfdc94-ee1c-4504-81e3-0833697cce80`, at
`awaiting_assurance`. This is preparation, not publication or installation.
The release checkout's manifest is `0.1.16`; primary working manifest `0.1.9`
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

## Real repository adoption boundary

Read-only inspection finds a pending initialization receipt alongside existing
legacy Host/workflow databases and operational work state. `.vida` contains only
the storage-admission gate, with no unified workspace database. Current configure
refuses that Host/work state; init reconciliation requires an already equal model,
and clean-init v2 derives its model from current config. A supported full-model
adoption route for this Host-present v1 consumer is not implemented or qualified.
Task 6 must resolve that configuration-owner boundary without resetting old data,
rewriting work/history or enabling the unrelated existing-storage upgrade gate.
The complete model and explicit plugin-to-codex conversion remain approved;
prospective implementation still needs its exact contract, scope and authority.
