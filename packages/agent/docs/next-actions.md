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
| [Task 3, clean-init effect owner](plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner)                                  | v0.1.12 installed; owner closeout open         | Persist actual terminal and published-artifact evidence through the existing release owner. C3 and its capture/readback corrections are published and installed. Reuse the qualified capture owner for old Task 4/5 claims; real init and Runtime acceptance remain open.                          |
| [Task 4, config/context adoption and Codex identity](plans/runtime-project-model.md#task-4--configcontext-adoption-and-codex-identity)          | Partial config/context component in WIP        | After qualified stopped-Source capture releases the old claim, complete public versioned types, configuration codecs, exact-byte adoption and journal/CAS/resume, fix selector matching, integrate callers and registration, and explicitly convert `plugin` to `codex` without rewriting history. |
| [Task 5, interactive init/config/help and package parity](plans/runtime-project-model.md#task-5--interactive-initconfighelp-and-package-parity) | Input/prompt component ready; integration open | Retain the four-file component and its Root corrections. After old-claim capture and Task 4 adapter delivery, integrate init/configure handlers, prompts, help, resources and package registration. Complete actual product/path setup and Source/native parity.                                   |
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

The old Task 4 and Task 5 Source claims remain unsettled. Complete terminal
inventories and two terminal records plus five later readonly-change events
are prepared; independent record review reports no findings and zero drift.
The corrected native owner is qualified and installed; runtime access is open
and the installed lifecycle has been read. Fresh targeted inspections closed
successfully for both works. Three independent Task 4 reviews reproduced the
exact installed binding, all 46 candidate tuples and terminal provenance, but
returned FAIL for operational readiness because public capture inspect refuses
`workspace inspection journal integrity differs`. No authorization or apply ran.

Bounded readonly diagnosis identified two valid corrective journals, R17 and R18.
The global inspector compares their engine run IDs directly with their Work base
run IDs; the existing `validateWorkSessionBinding` accepts both exact joins and
their current authorization bytes. The next causal correction is to reuse that
validator in global inspection while preserving every other identity, digest and
coordination check. Its two-file R19 plan and actual synthesis passed independent
review. Both actual prewrite PASS results and their attributed metadata
projections passed independent review. Runtime accepted physical completion of
the two-file Source delta after Luna's partial test work and separately attributed
Root correction. A genuine preimage RED and current GREEN are retained: three
cases, 260 assertions, zero failures across two processes. Scoped format, lint,
Source/bin types, AST and Vex passed; tests-project types retain three diagnostics
in two unowned Task 4 files. Independent actual-Source review is READY for this
bounded delta. Runtime accepted both Code PASS observations after fresh
independent reviews. Runtime also accepted the bounded tester PASS after its
independent review. Runtime prepared the Source-handoff instruction after Root
corrected its old-rights-only capture boundary and Task4-before-Task5 CAS order.
Fresh target qualification, corrected native delivery/install and public capture
remain pending; no init or Runtime acceptance is claimed. Retained developer evidence remains distinct
from verified native test execution and full numeric qualification.
This remains a Task 3 prerequisite, not another active feature task.

After corrected delivery, obtain fresh CAS and three passing exact request
reviews before capture. The retained failed Task 4 request cannot authorize it.
Task 5 needs fresh shared-Ledger CAS after Task 4 settlement. Capture releases
only old rights as failed partial work; it grants neither task completion nor
new Source rights.

## Current delivery state

The [Task 3 evidence record](plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner)
retains the accepted R15 Source/Code workflow. The published `0.1.12` baseline
contains C3, R17 stopped-Source capture and R18 bounded readback Source integrated
with fetched upstream in [main df99a11b](https://github.com/pomazanbohdan/vida-stack-lite/commit/df99a11b70bf604b4ef4ea4745093e5f3fd7564b).
The normal Windows pre-push passed static checks and all 122 selected cases in
five files, with observed closed native job groups. This is the Windows push
profile, not whole-product or Runtime qualification.

R18 retains a successful GET-only observation of all nine 0.1.11 assets and owner
preparation of candidate `0.1.12` at `awaiting_assurance`. The earlier preparation,
asset-body and public-inspection UNKNOWN observations keep their original status.
They are not evidence that the later readback or version preparation is missing.

Published `0.1.12`'s release Source binding is
`e21cfadf0e832984e3ecf0c05a54469819ecac54c128c5da1c00b4fa5ffe925a`.
The release checkout was fast-forwarded to that exact commit. The existing
owner issued matching Linux and Windows requests in the same operation and
retained six older requests. Pending state, journal and manifest were unchanged.
The earlier pair bound to `9ef581e7f77972a22af3c9ffcbded72ac35351f1ab4cec25718c16b983f9d3d9`
remains historical evidence and is not used for the new run.

[CI run 42363302934](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/42363302934)
attempt 1 passed release assurance and both native builds. Its publisher created
the matching annotated tag and draft `v0.1.12`, then failed after the draft-list
readback and before any asset upload. Fresh reads verified the exact operation,
Source, original producer artifacts, claim digest, draft metadata and zero assets.
Failed-job recovery used the same run without new Source, another dispatch or
tag overwrite. Attempt 2 completed successfully, including publication and the
external Linux install. Public latest is non-draft `v0.1.12` with the exact nine
claim-bound assets. The original attempt-1 failure is retained.

The public Windows installer updated the existing `0.1.11` installation to
`0.1.12` without a Source override. Its original process closed exit 0 and
reported cleanup complete; installed executable SHA-256 is
`de2e706990c494ec265511766ef8544b360d093415a8c74e60548c5de09d409c`.
Effective PATH selects that executable. Native `version` and all six requested
instruction lookups return `0.1.12`. The first outer wait timed out while the
original installer remained running; it was observed to completion, not retried.

Published `0.1.12`'s manifest is `0.1.12`; the primary working manifest remains
`0.1.9` as preserved WIP. The release checkout's local `0.1.12` operation remains
at `awaiting_assurance`, with its own installation leg not started. Public
installation does not settle that local journal; its existing owner must persist
the actual terminal and published-artifact evidence. The user-run release-path
allowance is effective. Actual init and user Runtime acceptance remain open.

R19's two-file corrective workspace inspection fix and this queue were published
in [main b4bb0b1d](https://github.com/pomazanbohdan/vida-stack-lite/commit/b4bb0b1d763adface6f9a325b77b43d2c10ab182).
Normal pre-commit passed formatting, typecheck and lint; normal Windows pre-push
passed its 122 selected cases. Primary main and the release checkout were
fast-forwarded with primary working files and both release-tree WIP files
preserved. The existing release owner then completed fresh all-nine published
readback and local CAS, selecting `0.1.13` at `awaiting_assurance`. Its manifest
change is version-only. Qualified native formation, publication and installation
are still pending; existing `0.1.12` does not prove R19's installed behavior.

Published main now contains the I-1 guard supporting `vida-agent` and legacy
`packages/agent`. Its earlier main/release divergence is reconciled. Do not open
another guard implementation task.

Historical `df99a11b` push, process, binding and capture-preparation evidence is
retained under `.agent/work/init-main-integration-20261107/`. That push preserved
the primary index; two unrelated Powers scripts changed during its interval,
with no actor attribution, and their current bytes were retained. R19 evidence
belongs to `.agent/work/runtime-corrective-workspace-inspection-20261107-r19/`.
Its normal-hook main commit/push and checkout reconciliation preserve primary
WIP. Capture candidates, bundle binding and CAS require fresh verification after
the corrected native installation; historical review packets grant no new rights.

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
