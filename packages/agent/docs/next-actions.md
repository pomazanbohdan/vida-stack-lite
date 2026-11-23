# Runtime next actions

Owner: runtime maintainers. Updated: 2026-11-23.
Class: derived task queue. The [system specification](system-specification.md),
[development lifecycle](../instructions/development-lifecycle.md) and
[testing policy](../TESTING.md) retain their contract ownership.

## Current delivery cycle

**Active:** finish the Bun 1.4.5 cycle and its causal expired-owner repair.
**Next:** resume Execution Catalog Task 1 through the delivered runtime.
Follow [one task per runtime-first delivery cycle](decisions/work-items/runtime-first-development.md).

The installed runtime is v0.1.21. Fresh inspection of
`agent-bun-145-20261120-r2`, attempt 1, returned Work 8, Ledger 146 and
Journal 19 with an expired lease, no pending actions and no recovery route.
The Source repair passed 11 focused cases, including ordinary live suspension
and release after expiry. Source and test typechecks covered 113 and 590 files.
The isolated Windows build and standalone verifier passed on Bun 1.4.5.
The in-memory readback projected release of one ticket and one claim, with
Journal 19 and phase PLAN retained. Actual ownership and delivery are open.

The wider run before package formation recorded 106 passes and six failures.
After formation, three of those six cases passed. The test-only distinct
prefix correction passed the foreign-scope refusal on a formed baseline.
In the serial Bun 1.4.5 comparison, validate reached its 60-second limit
on the baseline and passed on the candidate. Success reached that limit on
both. The candidate entered public issue at 53.0 s and its child exited on
SIGTERM at the case deadline. Devin reused the maintained readonly prewriter
fixture helper for setup. The four correction variants and foreign-scope
case then passed on the formed candidate. The implementation receipt records
success at 43.1 s and validate at 45.4 s. Independent OpenCode Go review
accepted the exact test diff and repeated success in 44.35 s with 66
assertions. The isolated preflight used published Source 8a4947a7, seven
reviewed file inputs and two scoped documentation updates. Frozen install,
typecheck, lint, SDK test inputs and 13 selected repair/provider tests
passed. The full absorption file recorded 52 passes and one workspace
projection timeout. All four correction variants and the foreign-scope
refusal passed. The projection repeat passed in 6.81 s with its unchanged
10 s test budget. The full-file timeout remains recorded. The release owner
finds 10 additional file differences outside those selected paths in the live
checkout, with broader manifest and lock changes inside the selected paths.
The repair keeps release history and admission in the canonical workspace.
The release owner prepares the version for the isolated candidate and binds
the final commit and exact Source digest before issuing both native requests.
An exact retry returns the same pair. The published 0.1.21 operation supplies
the baseline for the successor PATCH and retains its recorded assurance state.
The native issuer now binds committed Source and refuses a historical request
namespace without its own pair selection. Published-successor preparation and
issuance now require the exact preparation receipt, version-only afterimage
and committed Source lineage. The CLI fixture observed the publication
through the test GitHub boundary and retained the dirty working manifest.
Native artifact intake passed the staged-pair fixture with an existing SDK
archive. The reviewed intake correction passed 14 focused cases. The local
pack owner now publishes its retained SDK directory in one rename after
checking the dependency link, Source inventory and formation receipt. Packed
resume and custody readback check that directory before accepting the archive.
The focused SDK cases use mocked commands. Release qualification still needs
bound evidence from the actual pinned SDK build and pack, then native intake
for the same release operation.
The 5 s Windows formation test timed out on both the baseline and candidate
when configured with the same junctions. The 30 s diagnostic completed
the original test in 14.19 s. The fixture now separates pack and retarget
from the provider, refusal, integrity and assurance scenarios. The scoped
Windows repeat passed 13/13 at the configured 5 s limit. The original
failures and UNKNOWN roots remain retained. The older provider-bound
retarget fixture still reports Windows symlink EPERM on baseline and
candidate. The sealed committed intake case passed under its declared
30 s integration ceiling.
The combined absorption run on the scoped PATCH candidate recorded 48 passes
and five timeouts. A fresh validate-only fixture reproduced the 60 s failure.
The prior report returned exit 0 and the next issue child exited on SIGTERM
at the enclosing deadline. The current host's release CLI also fails at
module load because the primary checkout has a deleted SDK pack tool. Keep
the isolated Source staged for the next verified version preparation.
The isolation, process receipts,
and actual versus projected state are in
`.agent/work/agent-bun-145-20261120-r2/failed-delivery-owner-repair/WORK.md`.

| Order | Work and owner | Acceptance and check |
| --- | --- | --- |
| 1. Resolve the development gates | Root binds the clean Source baseline and candidate to Bun 1.4.5, the same environment and formed exports. Use `tests/automatic-work-absorption.test.ts` to separate fixture construction from the admission assertion. Compare each stalled correction across baseline and candidate. Record the last completed operation, child result and process closure before selecting a cause. Route any proven defect to its owner before editing. | The two-project fixture loads distinct prefixes. Admission refuses with `outside selected project membership`, creates no Work and records the one attempted admission. Each timeout has a measured boundary and a supported passing check or an explicit unresolved gate. Retain original failures and test budgets. |
| 2. Freeze the release packet | Root uses the existing release owner to select the next PATCH from verified publication and current pending state before final Source checks. Freeze the Bun pin, manifest and lock closure, the two repair files, affected checks and docs. Keep the independent dependency refresh and catalog work outside this packet. | Exact file hashes, version, currentness and scoped diff agree. The maintained frozen install, affected behavior suite, statics and applicable assurance pass on the final packet. Reuse independent evidence where its inputs still match. A required open check blocks this packet. |
| 3. Deliver and install | Root integrates the packet with normal hooks. Push requires the sidecar's separate instruction. Use the existing native CI/release owner for the authorized packet, then the maintained Windows installer on its selected public artifact. | Actual CI terminal and publication receipts bind Source, version and exact assets. Installed version, artifact hash, effective PATH and native instruction resolution agree. Preserve pending or uncertain owner effects for reconciliation before any retry. |
| 4. Recover the original owner | Through the repaired public continuation, Root refreshes the original work/attempt, configuration, ticket, claim, maintenance and Work/Ledger/Journal CAS. Use the current attributable binding at the effect boundary. | Exactly the expired owner is released. Readback retains Journal 19, phase, assurance and later queued rights. Any changed binding or unknown effect returns to its owner; the projection grants no execution rights. |
| 5. Resume Task 1 | Root prepares a fresh Task 0 packet and obtains ordinary admission/issue on the updated runtime. The assigned writer works within the issued scope and an independent validator checks the bound evidence. | Close the current structural-obligation gaps before issuing the pure YAML codec packet. Follow the [catalog implementation queue](plans/execution-catalog-and-teams.md#task-1--typed-final-contracts-and-finite-compiler-obligations). User Runtime acceptance requires its own attributable observation of the delivered version. |

Planning and acceptance criteria use the installed requirement-routing
instruction. Diagnostics use the Vida Powers root-cause and boundary-evidence
instructions. Independent proof follows the installed agent-allocation and
testing policies. Formation, installation, recovery and closeout follow the
installed development lifecycle. The checked Vida Powers selection is retained
in the repair record's `next-steps.retrieval.json`.

## Active implementation

The approved full model is active in this repository. Delivered runtime
0.1.20 completed the historical Host-present adoption and public
init reconciliation. The installed runtime is v0.1.21. Repository prefix
is VIDA; products are agent/AGENT,
codex/CODEX and powers/POWERS. The explicit local plugin-to-codex map is applied.
The unchanged model values are in
[the approved setup model](decisions/configuration/project-config.proposed.yaml).
The filename remains stable for existing references.

| Task | Current state | Remaining work |
| --- | --- | --- |
| [Task 3, clean-init effect owner](plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner) | Delivered; C3 and R17/R18/R19 corrections included in current runtime | Retained local release-journal closeout and wider fault/recovery qualification; no repeat implementation. |
| [Task 4, config/context adoption and Codex identity](plans/runtime-project-model.md#task-4--configcontext-adoption-and-codex-identity) | Delivered; approved product model is active in the real repository as unified `AgentRuntimeConfig/v1` | Numeric, full-suite and wider recovery qualification remain open. |
| [Task 5, interactive init/config/help and package parity](plans/runtime-project-model.md#task-5--interactive-initconfighelp-and-package-parity) | Delivered; fresh native init/configure/refusal/resume consumer passes | Physical TTY/SIGINT and wider qualification remain open. |
| [Task 6, full-model qualification and repository adoption](plans/runtime-project-model.md#task-6--temporary-end-to-end-acceptance-and-delivery) | Real repository adoption and public init reconciliation completed on 0.1.20 | Complete the wider work-operation, interrupted-recovery and numeric matrices; user Runtime acceptance remains unproved. |

The [implementation plan](plans/runtime-project-model.md) describes these same
tasks. Continue still-current work through the updated installed runtime with
fresh admission and current configuration bindings; old ownership disposal
grants no successor rights. Do not repeat completed implementation or init.

## Execution catalog architecture

The user's current design request selects a package baseline and repository-local
editable/enabled roles, profiles, detailed work definitions, teams and workflows.
The generic flow has three different team compositions plus one fixed VIDA flow;
all levels cover research through actual delivery verification. Parallel work
across tasks/batches retains existing ownership/CAS/UNKNOWN.

The [architecture proposal](research/configuration/execution-catalog-and-teams.md)
and [accepted intent](decisions/configuration/execution-catalog-and-teams.md)
record approved intent and architecture with conditions. The eight SWE-2 Flash /
DeepSeek 4.1 Flash formation reviews completed with APPROVE_WITH_CHANGES.
Root's revised final-state design closes their themes and Delphi's config
activation/lost-ack finding at design level. Targeted V3/V2 completed with
APPROVE_WITH_CHANGES and no Critical; Root corrected the four Important findings.
The [implementation plan](plans/execution-catalog-and-teams.md) assigns exact
owners, ordered tasks, checks and the temporary repair/removal handoff.
The earlier frozen-plan check passed on its old layout. The user's 2026-11-10
clarification now requires physical package/custom role/profile/task/team/workflow
components, file metadata and global/product kind routing. Both requested reviews
completed APPROVE_WITH_CHANGES, no Critical; Root corrected three Important:
selection dimensions, usable seed and explicit full-fork rebind. User approved
this revision and requested implementation through repository init, preserving
settings; development uses Devin SWE-2 Flash medium and validation Codex Luna
max. Old PASS does not cover these changed contracts. Luna's first-cycle
review found premature live selection/admission wiring. Root corrected Task 1
to pure final-value contracts and deferred live caller cutover to Task 9 after
qualified repair and cohort gates. Luna confirmed that boundary, then identified
a missing final project-manifest schema and package schema inventory. Root added
both to prospective Task 1; preserve the existing package version WIP. This last
scope correction is not independently re-reviewed. r17 attempt 2 synthesis is
accepted at journal revision 3 `f7064021`; the typed lease recovery was
refused with no effect, the completed-readonly release passed work2/ledger85,
and the lease is null/suspended with no successor; a
successor execution-catalog Task 1 requires fresh admission and an observed
native launch for swe-2-flash-medium via acpRegistry_devin. The configured
Luna writer still does not satisfy the user-selected Devin SWE-2 Flash
medium writer.
A fresh disposable native `init` succeeded with Luna defaults. Both
standalone 0.1.9 binaries return `unsupported artifact repair kind` for
`runtime-config`: current `reconcile-cli-contracts.ts` and
`reconcile-artifacts.ts` removed the old public rebind routes, so the
earlier selector refusal is historical. The disposable rebind inspection
issued no configuration or Source effect. Current proof:
`%TEMP%/vida-task6-profile-proof/evidence/proof-report.md`.

Root's testfix-r5 release completed: the exact original-owner operation
applied once under fresh Work/Ledger/Journal CAS, exited 0 with no
readback deviations, and released the execution lease; Work 9 retains
Ledger 86, Journal 20, PLAN phase and maintenance 0, with no Runtime
acceptance established. The packed trusted-host build passed its focused
rerun 14/14, and a disposable consumer verified exact expired-lease
release, exact replay, preserved journal and acceptance, and the refusal
cases. The same-v1 `configure --executor-model` change is implemented at
Source with Luna's independent diff review PASS. The isolated configure v1
proof is complete on the exact standalone exe (sha256 `044e51fa…`): a raw
native disposable v1 init/plan/apply changed cfg in exactly one scalar to
`swe-2-flash-medium`, the receipt digest matched, the operation archive
carried the exact before/target bindings, and exact resume replay returned
`completed` with inspect reporting `no_pending`. Luna independently verified
all three negative native applies exiting 1 — `Executor model is unchanged`
and `Public configuration plan changed` — with byte-identical cfg, receipt,
plan and `.agent` state before/after and no pending or archive effects.
Results: `.agent/work/agent-p0-bootstrap-20261118/task2-native-proof-20261118/evidence/results.json`
(sha256 `a86b78f1…f213e3`) and
`.agent/work/agent-p0-bootstrap-20261118/task2-native-noeffect-proof-20261118/evidence/results.json`
(sha256 `6a39c2d4…ae6feb`); this closeout rehashed both results files, the
no-effect manifest (`fcaab04a…`) and the exe. The proof covers only the
disposable project and HOME: the installed runtime remains non-release 0.1.9
with no live cfg replacement, and SDK closeout, delivery status and the r17
journal stay untouched. A disposable `task-execution-input-20261118` run on
the exact candidate exe (sha256 `044e51fa…bd70`) exercised native
`develop_task`/`task_execution` under a Host attempt: the writer wave
completed a T3 `acpRegistry_devin` launch binding `swe-2-flash-medium` with
`executedModel:null`, changed only `proof.txt`, passed the exact 15-byte
assertion (exit 0) and two accepted validators, and stayed inside the
disposable project. Runtime verification remained caller-reported
(`caller_report_consistency`, `test_execution_verified=false`) with no
delivery authority. The delivery child returned a terminal GAP —
`prepare_delivery` pending at journal revision 18 `pending_observation` —
because the caller-reported test receipt and absent native writer/tester
issue/report evidence are unverified; the GAP report declined (exit 1) and a
read-only inspect confirmed the same revision-18 `pending_observation` with
no repeat. Evidence:
`.agent/work/agent-p0-bootstrap-20261118/task-execution-input-20261118/evidence/{results.json,manifest.json,root-report-wave-5-gap.result.json,root-inspect-after-delivery-gap.result.json,root-inspect-after-delivery-gap.stdout.txt}`
and
`.agent/work/agent-p0-bootstrap-20261118/task-execution-input-20261118/disposable/project/.agent/work/task-exec-input-20261118/{writer-native-evidence.json,tester-native-evidence.json,delivery-gap-observation.json,delivery-gap-native-evidence.json}`.
The completed SDK export work is distinct from execution-catalog
Task 1 and claims no dispatch, live configuration or installation, or task
acceptance. Two legacy tests timeout at 30 s in matched before+after runs;
the cause is unassigned. The installed payload remains non-release 0.1.9 — no
T3 Devin dispatch, live availability or published release is implied — and
the repair-3 hardening-2 candidate stays uninstalled pending the delivery
gate.

No Source issuance or prod
delivery is claimed. Follow P0 bugs → P1 optimizations → P2 catalog; qualification
and atomic repair/removal precede effectful activation.

## Proposed next contour

The next proposed increment is one ordinary Agent TASK through the existing
flow on the active unified v1 config: synthesis → prewrite → implementation →
focused validation → tests → delivery proposal, followed by the applicable
delivery owners. This extends the open Task 6 end-to-end criteria and requires
fresh writer admission.

The current P0 sequence is clean-init of a real repository with protected
work/Host and the chosen agents, then one ordinary real Agent task with
evidence — the latter remains the Task 6 extension above. Clean-init
evidence so far: the DA2E… portable synthetic three-product existing-Host
`apply` exited 0 in 171.5 s with archive, preservation and inspect complete
and the release passed
(`.agent/work/agent-p0-bootstrap-20261118/clean-init-existing-host-native-apply-single-20261118/evidence/verification.json`,
sha256 `7c21295d…`); `retire` exited 0 with exact bytes in history and
inspect absent
(`.agent/work/agent-p0-bootstrap-20261118/clean-init-existing-host-retire-20261118/evidence/verification.json`,
sha256 `3c72b96a…`); the actual post-retire configure `plan` exited 1 —
`Existing work or coordination state is not eligible` — on an unchanged
snapshot with no apply
(`.agent/work/agent-p0-bootstrap-20261118/clean-init-post-retire-configure-20261118/evidence/results.json`,
sha256 `75c5867f…`). The missing-Host pristine intent's prior failure stays
retained; the source early refusal with exact cfg digest binding was
independently verified 5/0 at op SHA `84ce…fe7c`, and the isolated old
artifact proof did not run the updated source. Historical 120 s/hook tests
remain open. The revised Windows isolated three-product clean-init
with retained Host passed the exact model-bound plan/apply/refusals/retire on
exe sha256 `5eddaf31…481c`
(`.agent/work/agent-p0-bootstrap-20261118/clean-init-executor-model-runtime-20261118/evidence/results.json`,
`.agent/work/agent-p0-bootstrap-20261118/clean-init-executor-model-native-apply-20261118/evidence/{results.json,retire-results.json}`).
A fresh `post-clean-init-verified-proof-20261118` task then ran end to end on
that fixture: the issued `develop_task` completed a T3 `acpRegistry_devin`
launch requesting `swe-2-flash-medium` with `executedModel` not reported,
changed only `packages/agent/src/readiness-proof.txt` to the exact 15-byte
`state=verified`, passed two Luna validators and the independent exact-byte
test tool (exit 0); runtime classification stayed
`caller_report_consistency`/`test_execution_verified=false`. The native exe
accepted a real `VidaDeliveryProposal/v1` and reached terminal
success/complete at revision 20 with 7 observations, no next actions and a
`DeliveryInstruction/v1` scoped to `isolated-fixture` only
(`.agent/work/agent-p0-bootstrap-20261118/clean-init-executor-native-task-20261118/evidence/{root-verified-issue-delivery.stdout.txt,root-verified-report-delivery.stdout.txt}`,
report sha256 `1757c026…73b42`). The old pre-Host
configure proof and the historical ts test classifier stay scoped.

- P0: the terminal `prepare_delivery` GAP guard is implemented in Source and
  independently verified — the failure regression passed 1/0 and the accepted
  delivery-proposal success check passed 1/0 in this run
  (`.agent/work/agent-p0-bootstrap-20261118/delivery-success-source-proof/`).
  The historical native revision-18 `pending_observation` stays fenced as a
  separate earlier failure, the session-handoff hook timeout remains open,
  and the next P0 is reviewed source integration plus release
  qualification/install before any live clean-init and ordinary Agent task —
  not reissue or a delivery effect. No deployment, live change, commit, push,
  release or Runtime acceptance is claimed.
- P0: trace actual product-source context and TASK identity through admission/result;
  repair only a demonstrated missing seam, without a second tracker or resolver.
- P1, or a demonstrated causal prerequisite: readiness/maps and missing navigation;
  reuse canonical documents, preserve old IDs/providers and fabricate no BR/AC.
- P1: clear operational status, causal recovery and unchanged quality gates.
- P2: scoped Codex/Powers rollout, release-journal closeout and installer recovery.

Missing backlogs does not itself prove a store defect: its existing create owner
can initialize it. Missing new wiki folders do not generally block a task whose
canonical sources already exist. Establish the supported path before adding an
adapter or maturity gate. Graph/GUI/external tracker expansion follows a working
local vertical slice and its own decision.

## Current delivery state

Published and installed runtime is
[v0.1.21](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.21),
Source [8a4947a7](https://github.com/pomazanbohdan/vida-stack-lite/commit/8a4947a72ef0e385f8d4e0b661fea9c3a2c73541).
[CI44425055346](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/44425055346)
completed release assurance and both native producers on producer attempt 1,
then completed publication as attempt 2 after the retained attempt-1 publisher
failure. GET-only readback verified the release, tag, claim, all nine assets,
the successful jobs and the external Linux installation. The earlier 0.1.21
run [44412070386](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/44412070386)
remains a retained FAIL with `CI Source differs from current request`; it
created no tag or release.

The maintained Windows update installed exe SHA256
`298107c13ec6fe3f5f41df7ced4f9ee7fd80271b4a08be5de193c813757435a2`,
replacing the non-release 0.1.9 exe `d8636d87043f39dfd19d4936dd73b472fe19271aab3c13f65e820d2f363969f5`.
Verification recorded installer SHA256
`f3145ae49175eb15d594ac5b116110d883ea6a8baf7e5ec6e4f531fa790a08f0`, receipt
path addition and `clean-init --help` exit 0; `runtime_accepted` remains
false. The bound local release state remains `awaiting_assurance`.

A real clean-init on the installed 0.1.21 completed operation
`d709ca8e-6989-48e7-97c4-aa6deaad5969` for workspace
`4d47f323554bf4cee65c7071467d48f8ac1cbca50c87c959336df7fbb9008bfe` with
executor `swe-2-flash-medium`. Apply and retire completed under plan binding
`7514dfb2539da1d2d83a44154ff85c9a76b538dc963a0821ce5ac602deb786a5`;
`inspect-retire` reports absent, the resulting initialization receipt keeps
`workspace_binding_status` pending, and the before/after
`HostWorkspaceInspection/v1` snapshots are byte-identical with SHA256
`0e32ab0d40f02e0c9ef0cb2e9f175553d5898f7629af1dde78b29d39e67a7ab3`. This is
platform proof, not Runtime acceptance.

The v0.1.20 release evidence, the replaced non-release 0.1.9 payload proof and
the repair-3 hardening-2 candidate proof are historical. Their retained FAIL
and UNKNOWN records remain unchanged, as do the rejected 0.1.21 run and the
initial publication failure. Broader work-operation, interrupted-recovery,
numeric/full-suite qualification and attributable user Runtime acceptance
remain open.

## Real repository adoption boundary

After fresh delivered qualification, the supported exact owner released three
corrective Source frontiers and two observed-terminal readonly owners. The
completed current Source workflow was disposed through its existing owner.
Together with the earlier 18 dispositions, 24 old/current own leases are released.
Original tester FAIL, readonly UNKNOWN and safety STOP remain unchanged; no old
worker, denied operation, pending report or journal was replayed.

Fresh inspection found zero active leases, tickets and claims. The earlier
0.1.19 apply refusal was reconciled against all five unchanged beforeimages and
an absent pending file. A fresh plan, current consent/CAS and native maintenance
quiescence/exclusive admission then completed configure v3 operation
`config-7947f500ad8551fd1f9880f19c6d1715fcff12156f94f2c79bc095bba2685956`. Public init returned `existing` against the adopted
configuration; this is preserved-output reconciliation, not a data reset.

Active cfg is unified `AgentRuntimeConfig/v1` (version 1) carrying the full approved product model — repository/product prefixes, documents areas, work-item stores, enabled types and hierarchy; the parallel v2 contract was cancelled 2026-11-13 per [runtime-config-single-version](decisions/configuration/runtime-config-single-version.md). Its full model equals the approved input.
The receipt has provenance `adopted_existing`, its cfg digest matches, and the
operation is archived with no pending init file. AGENTS, sidecar and documentation
policy bytes are unchanged. Public history inspection verifies all 48
Work rows, 48 journals and the shared Ledger unchanged after
adoption. Old IDs, providers, history, data and DB layout retain their owners.

Evidence: `.agent/work/runtime-terminal-owner-disposal-20261109-r1/` contains delivery/readback/install observations,
`delivered-host-consumer-result.json`, `delivered-terminal-consumer-result.json`,
exact owner records, `global-quiescence-observation.json`,
`actual-root-result.json` and `history-preserved.json`.
The real cfg and receipt are machine state and are not included in the docs commit.
Technical initialization is complete; attributable user Runtime acceptance is false.

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

Verified v0.1.20 artifact digests (exe sha256 `90739face0…`, installer
`install-windows.ps1` sha256 `f3145ae4…`, manifest/provenance consistent) and
the foreign-cwd first-run resource lookup with Bun/Node absent on PATH passed
on a warm cache only — see
`.agent/work/installer-qualification-v0.1.20-20261117/WORK.md`. A separate
v0.1.20 cold-cache run is observed in `COLD-CACHE-PROOF.md` in the same
directory: Luna's narrow PASS carries a raw subprocess environment snapshot
gap. Offline resource discovery and Windows rollback through the maintained
installer owner remain open; the installer has no isolation mode, so mutating
install/update/rollback/uninstall cases stay unexercised. Reuse matching
Task 6 evidence for shared scenarios. Preserve ambiguous installer/process
effects for their reconciliation owner.

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
