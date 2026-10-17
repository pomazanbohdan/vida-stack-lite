# VIDA backlog priorities

Status date: 2026-10-17. This page is the current priority index. The eight P0 and ten P1 rows are work contours, not counts of confirmed defects. Stable task IDs and historical decisions remain recoverable at `bbd6e73ed5bb1f98dd79a64980425cf85dae9a4e:.agent/work/vida-013-planning-20261002/BACKLOG-PRIORITIES-20261006.md`.

The execution order lives in [CLEAN-START-STRATEGY-20261009.md](../core-runtime-reactivation/CLEAN-START-STRATEGY-20261009.md). Current evidence lives in [WORK.md](../core-runtime-reactivation/WORK.md). Root owns integration and final acceptance.
Current preparation and terminal measurements are maintained once in
[WORK.md](../core-runtime-reactivation/WORK.md) and its linked generated contour
projection. Earlier role, test and timing counts are dated evidence, not current
acceptance. Complete numeric qualification and runtime cutover remain open.

## Priority rules

- **P0** fixes a reproduced defect in an existing contract, a blocker, a security or data failure, or required delivery of an existing fix.
- **P1** reduces work, reads, calls, or checks in supported behavior.
- **P2** adds a capability, public contract, execution mode, engine behavior, adapter, or UI.
- **GAP** means required proof is missing. Missing proof alone does not make a bug.
- A reproduced defect found during P1 or P2 work joins the current CLEAR scope. Archived attempts, leases, issued effects, and UNKNOWN operations are never restored or replayed.

## P0 contours

| Contour                                                               | Current disposition                                                                             | Open acceptance                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Admission and ownership: `F01`, `F02`, `F04`, `F06`, `P0-02`, `P0-04` | Post-read hardlink privacy race reproduced and fixed; real filesystem regression passes. See WORK for retained RED/GREEN. | Fresh Source numeric qualification, complete acceptance and native Runtime evidence. |
| Root and unresolved writer: `F03`, `F05`                              | Bound-root renewal and terminal/quiescence fences are retained.                                 | Target qualification. UNKNOWN operations remain closed.                                                         |
| Rollback and filesystem: `F07`, `F09`                                 | Merge acquisition and thrown-undefined cleanup defects fixed with17PASS and independent acceptance. Host rollback cause loss and temporary-path cleanup ownership remain open; see WORK audit. | Preserve cleanup custody; correct remaining cause/ownership findings, then native target proof. Linux or simulation evidence does not prove Windows behavior. |
| Pre-commit: `P0-03` and existing hook work                            | Ordinary strict hook passed on published packages. The old Babel blocker is resolved.           | Shared final quality acceptance.                                                                                |
| Audit18 F1                                                            | Shared codecs and retry/lookup fixes are implemented. Large composite and history cases passed. | Complete numeric acceptance and native delivery.                                                                |
| Audit18 F2                                                            | Exact prefix, resume, and conflict handling is implemented.                                     | Final acceptance and delivery. Do not duplicate the existing matrix.                                            |
| Audit18 F3                                                            | Read-only snapshot and concurrent WAL regression are implemented and have focused proof.        | Shared final acceptance.                                                                                        |
| Delivery: `P0-01`                                                     | Source and SDK publication are not native installation.                                         | One whole-agent formation and delivery, followed by an isolated Runtime matrix.                                 |

## P1 contours

| Contour                   | Stable IDs                                                                                                    | Current disposition and remaining work                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace database        | `WF07`, `WF08`, `DB01` through `DB11`                                                                         | Shared Bun SQLite paths and adapter exist. Remove the separate admission database only after lifetime exclusion and bundle-owned repair are qualified. Prove disk creation, backup, restart, and rollback. In-memory tests do not prove disk behavior.         |
| Execution and diagnostics | `OPT01` through `OPT04`, `OPT14`, `OPT16`, `BL-FLOW002`, `BL-FLOW006`, `BL-FLOW007`, `BL-FLOW013`, audit18 F4 | Shared contracts, SDK refusal cause, and typed local-session diagnosis exist. Complete affected-flow acceptance. Advisory remains read-only and grants no new authority. New routing or profiles remain P2.                                                    |
| Context and reads         | `OPT11`, `OPT12`, `OPT13`, `BL-FLOW003`                                                                       | Bounded reads and freshness guards exist. Complete history/current-owner lookup contracts and specific SQL improvements. New sidecars or read models remain P2.                                                                                                |
| Test and quality tooling  | `TEST-013-01` through `TEST-013-07`, `OPT10`, `OPT14`, `OPT15`, `DB05`, `DB06`                                | Bun migration and tooling are implemented in part. Finish exact coverage, frozen correspondence, full CRAP plan, mutation qualification, and resource-safe shards. Vitest retirement applies to maintained test paths. New runtime proof frameworks remain P2. |
| Transport and reporting   | `OPT05`, `OPT06`, `OPT08`, `OPT09`, `BL-FLOW004`, `BL-FLOW005`                                                | Existing scope includes wave CAS, partial-report restart, retry, foreign, and prefix cases. Preserve CAS, accepted-prefix, and UNKNOWN rules. New partial-report semantics remain P2. Existing retry defects are P0.                                           |
| Delivery and binding      | `BL-RUNTIME-PATCH-VERSION-001`, `BL-DELIVERY-RELEASE-001`, `SA08`                                             | Current cohort, version, and cache bindings exist. Reuse known build/download and operation results. Missing required identity/result binding is P0. A new allocator or Release resolver remains P2.                                                           |
| Cleanup                   | audit18 L1                                                                                                    | Source cleanup is published. Do not restore removed code or stale pending work.                                                                                                                                                                                |
| Governance                | `BL-DEPENDENCY-UPGRADE-001`                                                                                   | Edictum dependency was removed; Mastra and VIDA integration exists. Complete current behavioral and numeric proof.                                                                                                                                             |
| Bun migration             | Existing Bun migration scope                                                                                  | Maintained Source migration is complete. Qualify supported native flows and option matrix. Generated SDK output remains a separate boundary.                                                                                                                   |
| `.vida` upgrade           | `WF05`, `WF06`, `WF09`, `WF10`, `WF11`                                                                        | Plan/apply/resume and last-file/activation-death Source cases have focused proof. Active init and loader cutover need a ready repair and a fresh native matrix.                                                                                                |

## Test acceptance boundary

The owner now selects the [rolling three-contour cycle](../../../packages/agent/TESTING.md#rolling-contour-repair-cycle): one blind Luna lane per contour,
repair and affected checks before numeric qualification, immediate slot refill
only after a compatible exact coverage/frozen-CRAP/assertion-Killed100 closure.
Root owns final checks and integrates isolated preparation after terminal custody.
Current audit corrections and unresolved per-field validation, cleanup analogues
and optimization candidates are recorded once in WORK, under the existing P0/P1
and TEST013 tasks; external report labels do not replace their stable IDs.

The fresh body-local facade triple at91906ff has refilled its slot with storage
image. Main-host has a fresh compatible triple atfebad42 and immediately refills
its slot with fs-safe-attestation. Attestation now has exact L4/4,S4/4 with no
callable/branch inventory and a reader-validated full7/7 native Killed proof;
its explicit CRAP applicability gap parks the contour without a closure. The
released slot prepares service-operation-custody. Active lanes are storage image,
envelopes and service-operation-custody; admission's
stateful static-initialization gap releases its idle slot without a closure.
Initialization remains OPEN on qualified child-only activation evidence. Admission's caller-owned
request defect now has real RED/GREEN evidence and a bounded snapshot correction.
Its interrupted mutation attempt stays UNKNOWN. The native pilot now shares one
partition deadline across all batches; fresh numeric qualification remains open.
The storage-image lane reuses its recorded pair as history and needs fresh evidence.
Envelope's five
new survivors have targeted native Killed confirmations, and admission's real
initial/exclusive/checkpoint dual-error phases share their fixture and exact owned cleanup.
Initialization's package-asset reader correction preserves the sealed input
contract; its remaining activation gap is distinct from setup and generic failures.
Full compatible mutation closures remain OPEN; diagnostic sets are not unioned.
WORK owns the exact receipts and pending equivalent/unattempted mutant analysis.
The image survivor exposed a duplicate subset-schema read after exact whole-schema
equality. Independent review accepts its removal, with two explicitly retired
Source-added callbacks and unchanged ceilings for all surviving roles; fresh
original-lineage frozen proof remains required. Its follow-up reuses the validated
final schema array for the digest, removing a second post-merge catalog read with
unchanged50-role correspondence and original ceilings. The data-only attestation
Source remains executable for coverage/mutation; CRAP applicability needs explicit
empty-callable proof, not a synthetic zero score or static-export exemption.
Actual fault controls also expose missing private-DB close when memory-client
construction fails in inventory and Host-clone preparation. The existing image
initializer now owns both setup and cleanup for either prepared DB, with tagged
outcomes and flat ordered body/store/DB causes. Shared-body deletion preserves all
50identities and prospective ceilings; affected regressions pass. Fresh numeric
qualification remains OPEN. WORK owns the exact RED/GREEN and mutation receipts.

Within TEST013, real capture fault controls expose skipped native log close after
sync failure and unread-pipe backpressure after log open/write failure. Published
8120162 fixes both, preserving observed child custody and ordered capture codes;
incomplete/failed output still denies mutation admission under unchanged budgets.
The current image packet also strengthens real SQLite schema/integrity/custody
and independent digest/ledger assertions. Fresh compatible full mutation remains
OPEN; historical UNKNOWN namespaces stay retained rather than replayed.
An analogous image review also confirms two product error-masking defects in
readonly catalog close and INSERT statement finalization. Shared existing cleanup
finishing now retains undefined/body/cleanup identities and ordered aggregates;
real-handle RED/GREEN tests cover both. Existing50caps stay10/10; two new cleanup
callbacks have separately reviewed prospective1/1 caps, awaiting immutable pin
and fresh numerical proof. No current score or closure is inferred from this fix.

The `TEST013` task family retains stable IDs `TEST-013-01` through `TEST-013-07`. Its scope includes shrinking and seed/path replay, executable scenarios, independent models, persisted/restart/CAS/fault cases, supported CLI/SDK/inspector paths, and one coordinated local numeric run. Keep the original task-specific acceptance criteria in the historical record.

Fixture import effects and pending/elapsed Source-repair teardown are corrected
with native timeout-retention controls. Frozen correspondence and scoped budget
repairs continue; the full exact gates remain open. WORK owns current counts,
checks, published commits and unresolved resource/SDK prerequisites.

Per-contour numeric progress is now the
[automatic derived document](../core-runtime-reactivation/CONTOUR-STATUS.md),
regenerated from existing coverage/mutation producers and its durable JSON
snapshot. It separates historical achievement, latest attempt, currentness and
frozen qualification. Keep TEST013 IDs and their acceptance unchanged; no second
manual progress ledger is required.

Global canonical mutant maps, complete partition-matrix validation and retained
plan/event evidence are implemented under the existing test-quality tasks.
Local main-host qualification does not close full mutation acceptance. The current
2026-10-16 user instruction requests all/unclosed contour diagnostics, including
the full unfiltered kernel selection under its existing mutation limit. Run via
`test:contours`; its explicit pilot evidence does not activate native per-test
filtering or replace full qualification. Unresolved function/scenario associations
remain explicit gaps.

P1 requires 100% functions, lines, statements, and branches, an exhaustive frozen per-function correspondence, a complete reviewed CRAP plan, and 100% assertion-confirmed Killed mutants. Keep the required tests and SDK in the final input set. Survived, uncovered, timed-out, errored, or unreviewed equivalent mutants do not pass. Reuse current captured inputs where the owner supports it. One incomplete or UNKNOWN run is not a numeric result. Do not increase resource limits or remove custody checks to force completion.

## Accepted P2 boundaries

| P2 area                                         | Existing IDs and prerequisites                                                   | Boundary                                                                                                                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portable core contracts and repair              | `EPIC-CONFIGURABLE-AGENT-SYSTEM-001`, `BL-FLOW006`, `BL-FLOW007`, `WF05`, `WF06` | Typed block I/O, execution evidence, and completion contracts on current WorkItem kinds. No custom business task-type registry.                                                                                                 |
| Blocks and flow                                 | `OPT16`, `BL-FLOW006`, `BL-FLOW007`, `BL-FLOW013`, `G02`                         | Registered agent, tool, and subflow execution; configurable compile, conditional, failure, and dependency-ready joins. Host authority and Mastra execution remain. Full task boards and provider mapping are not prerequisites. |
| Child execution and recovery                    | `BL-FLOW008`, `BL-FLOW009`, `OPT01`, `OPT06`, `OPT08`, `OPT13`                   | Child identity, inputs, criteria, dependencies, admission, ownership, cancellation, loops, restart, and partial paths depend on core and flow contracts.                                                                        |
| Adaptive routing                                | `OPT16`, `BL-FLOW013`                                                            | Allowlisted model and effort selection follows typed block and outcome contracts. UI is independent.                                                                                                                            |
| Context, discovery, skills, and impact          | `OPT11`, `OPT12`, `OPT13`, `WF06`, `BL-FLOW006`                                  | Sidecar references, tags, discovery, skill selection, and impact flows follow required block and child contracts.                                                                                                               |
| Storage and API extensions                      | `DB01` through `DB11`, `WF09`, `F08`, audit18 C1, `G01`                          | New read models, APIs, and exact-result SDK contracts. Combining current Host/Mastra databases is already P1.                                                                                                                   |
| Developer hooks, isolation, delivery extensions | `P0-03`, `BL-RUNTIME-PATCH-VERSION-001`, `BL-DELIVERY-RELEASE-001`, `SA08`       | New hooks, optional canonical-Host worktree, allocator, and Release-only resolver remain P2. The agreed pre-commit belongs to P1.                                                                                               |

## Stable ID index

This compact index keeps IDs visible while avoiding repeated daily status narratives. The full original descriptions, task mappings, and prior dispositions are retained at the Git reference above.

- Audit and repair IDs: `F01` through `F09`; audit18 `F1`, `F2`, `F3`, `F4`, `L1`, and `C1`.
- Flow IDs: `BL-FLOW002`, `BL-FLOW003`, `BL-FLOW004`, `BL-FLOW005`, `BL-FLOW006`, `BL-FLOW007`, `BL-FLOW008`, `BL-FLOW009`, `BL-FLOW010`, `BL-FLOW013`.
- Optimization IDs: `OPT01` through `OPT19`. `OPT19` is retired from active work because the lifecycle forbids a separate ROI, benchmark, token, or scoring lane.
- Storage IDs: `DB01` through `DB11`; workflow IDs: `WF05` through `WF11`.
- Governance and delivery IDs: `G01`, `G02`, `SA08`, `BL-RUNTIME-PATCH-VERSION-001`, `BL-DELIVERY-RELEASE-001`, `BL-DEPENDENCY-UPGRADE-001`.
- Existing P0 IDs: `P0-01`, `P0-02`, `P0-03`, `P0-04`.
- Testing IDs: `TEST013`, `TEST-013-01` through `TEST-013-07`.
- Configurable-agent epic: `EPIC-CONFIGURABLE-AGENT-SYSTEM-001`.

## Provenance

The source backlog at `bbd6e73ed5bb1f98dd79a64980425cf85dae9a4e:.agent/work/vida-013-planning-20261002/BACKLOG-PRIORITIES-20261006.md` preserves prior wording, daily updates, task details, and accepted decisions. The current page replaces stale status repetition with one current disposition per contour. It does not claim that an open acceptance item passed.
