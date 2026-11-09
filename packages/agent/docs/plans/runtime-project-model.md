---
type: Implementation Plan
title: Runtime product model implementation
---

# Runtime product model implementation plan

> Root owns implementation coordination, Git and native/publication effects. Use independent configured Code and tester roles. The user authorizes Luna in place of unavailable Devin; no specific unavailable provider blocks work. Keep actual writer and reviewer attribution distinct. User already authorized execution; do not ask again for a routine plan/execution choice.

**Goal:** implement the approved product/wiki/work-item model, qualify temporary CLI setup, release the next PATCH, externally update Windows runtime and safely clean-initialize this repository.

**Architecture:** one runtime catalog and generic product-policy model; existing config/context and safe-filesystem owners consume it. Work records have stable UUIDs, typed keys, aliases and product-configured hierarchy. Existing repair/configuration owners govern schema/adoption and clean reset.

**Tech stack:** pinned Bun 1.4.4, existing TypeScript/Zod/Ajv/YAML/fs-safe dependencies; native Linux/Windows release workflow; Bash/PowerShell external installers.

**Spec:** [approved model with annotations](../decisions/configuration/runtime-project-model.md), [clean-init authorization](../decisions/configuration/clean-init-authorization.md). Derived execution record: `.agent/work/runtime-project-model-implementation-20261102/WORK.md`.

## Execution cycles

Follow the [one-task runtime-first delivery cycle](../decisions/work-items/runtime-first-development.md). This plan describes the full program; it is not one release batch. Start one task through the installed runtime. If a demonstrated runtime defect blocks it, fix only that defect and finish the same task outside runtime. Qualify, deliver a new PATCH build, update the system runtime, and reconcile Markdown before starting the next task through that updated runtime.

The [canonical queue](../next-actions.md#active-implementation) owns current priority and dependencies. Tasks 1–5 have their delivered prerequisites; current runtime 0.1.17 passes the bounded full-model consumer. Task 6 owns the missing Host-present adoption capability and real repository initialization. Local release closeout and broader qualification remain explicit. Preserve release gates, original attempt dispositions and the distinction between Source completion, delivery and user Runtime acceptance.

## Global constraints

- Target product IDs `agent`, `codex`, `powers`; no active Codex identity named `plugin`. Preserve historical attribution through explicit conversion, not text replacement of evidence.
- Runtime catalog retains canonical kinds `epic`, `feature`, `pbi`, `story`, `bug`, `task`, `research` and their provider mappings. Initial project enabled types can be a subset. Codes belong to runtime, never product overrides.
- Parent/child type combinations are generic product policy; no hardcoded PBI/BUG/TASK matrix or unconditional TASK leaf. Keep one parent, acyclic same-product containment and explicit external links.
- Stable internal UUID and number on type change; human key changes type prefix; old keys resolve to the same identity. Counter spans kinds within product, monotonic, no reuse; crash gaps allowed.
- One OKF wiki with index.md, topic research/decisions and per-area requirements; no duplicate internal/output corpus. Code/docs mappings independent and may overlap.
- Missing material init choices go to user via injected prompt boundary. Complete explicit noninteractive inputs are allowed; absent answers are not implied approval.
- This repository's clean-init prefixes are explicitly confirmed: repository `VIDA`, Agent `AGENT`, Codex `CODEX`, Powers `POWERS`. Carry them into the supported setup owner without asking again; do not activate new cfg fields before their implementation/adoption gates.
- Published strict-v1 active-artifact formats must not be silently widened before a supported atomic repair/adoption owner. Preserve CAS, safe filesystem, UNKNOWN, native evidence and installed-vs-Source boundaries.
- Root alone uses Git, dispatches/releases workflows, installs or resets the real repository. Workers never commit, publish, update real installed files or clean real state.
- No new external runtime for installers; Linux Bash/system tools, Windows PowerShell/system tools. Software version increments PATCH. The existing owner selects the next candidate from verified live state. The [canonical queue](../next-actions.md#current-delivery-state) separates main Source, release checkout, public and installed versions.

## Review focus

1. Unknown/disabled catalog codes and policy references: reject precisely without deleting readable legacy work.
2. Missing prefixes/mappings with non-TTY stdin: explicit input-required result, no hang or silent default.
3. Counter/record crash boundary and concurrent creates: no duplicated/reused number; inspect/resume preserves exact effects.
4. Reclassification under configured type edges and existing children: validate the actual product policy, preserve IDs/aliases and unchanged record on failure.
5. Clean-init archive interruption, symlinks and foreign files: retain docs/work/evidence, refuse unowned paths, verify before-images and resumability.

## Task 1 — reusable catalog and product model

**Status:** integrated Source dependency reused by Task 2. Active config/context adoption remains Task 4. The criteria below are the acceptance baseline, not a new implementation queue.

**Files:** create `packages/agent/src/work-items/catalog.ts`, `packages/agent/src/config/product-model.ts`, `packages/agent/schemas/product-model.v1.schema.json`; tests `tests/work-item-catalog.test.ts`, `tests/product-model.test.ts`. Conditionally modify `src/config/runtime-config.ts` only to centralize/re-export its canonical-kind type without changing behavior. Do not change active runtime-config v1 validation.

**Interfaces:** runtime-owned frozen `{kind, code}` catalog retains seven kinds and their uppercase codes. `getWorkItemType(kindOrCode: string)` matches exact lowercase kind or uppercase code; other casing/unknown returns undefined. Export Zod `productModelSchema` and inferred `ProductModelDefinition`, `ProductDefinition`, `ProductHierarchyPolicy`. `validateProductHierarchy(policy, enabledTypes)` validates references; `isChildTypeAllowed(policy, enabledTypes, parentCode, childCode)` requires explicit enabled-set context.

Model mirrors approved YAML: repository id/prefix, projects with id/prefix/source selectors, documents root/index/requirements root/areas/research/decisions, work_items storage_root/enabled_types/hierarchy. Hierarchy is discriminated `{mode:'any'}` or `{mode:'custom', allowed_children: Record<string,string[]>}`. Export `isChildTypeAllowed(policy, enabledTypes, parentCode, childCode)` with explicit enabled-type context. In custom mode a missing parent entry allows no child; unknown/disabled codes are invalid config. In any mode all enabled type pairs are allowed. Topology validation is a later store responsibility.

Exact envelope: required `schema: 'ProductModel/v1'`, `version: 1`, `repository: {repository_id, prefix}`, and nonempty `projects`. Each project requires `project_id`, `title`, `prefix`, `project_root`, `code_selectors`, `documents: {root,index,requirements:{root,areas:{<id>:{business,system,acceptance,test_cases}}},research,decisions}`, and `work_items: {storage_root,enabled_types,hierarchy}`. No silent defaults. The YAML proposal is a shape reference pending real hierarchy answers, not a complete valid fixture.

Hierarchy is required; any-mode must be explicit. Empty custom map is valid and permits no children; duplicate array entries are invalid. `enabled_types`, `code_selectors` and requirements `areas` may be empty, with later operation readiness checks. Duplicate object keys are a raw loader/parser concern, not detectable after parsed input.

Zod is the semantic authority for Task 1; JSON Schema is a declarative integration artifact for Task 4. Add a parity fixture set for envelope, required hierarchy/modes, enum membership and additional-property rejection; contextual enabled references remain semantic checks. Do not register the artifact as an active v1 resource yet. Report deferred package schema inventories and runtime resource-list registration explicitly.

Path validation follows the existing pure rules at `src/config/project-context.ts:356-372` and its `invalidPathSegment` dependency. A pure local helper must preserve those rules without importing project-context or doing filesystem I/O. Directory/file path fields use it; code_selectors are nonempty strings with existing glob syntax and are not subjected to the no-wildcard path rule. Prefix regex is `^[A-Z][A-Z0-9]*$`.

- Acceptance baseline covers seven canonical kinds, unknown codes, duplicate prefixes/IDs, malformed paths, policy references and explicit codex identity. Policy fixtures cover TASK→PBI, BUG→BUG and PBI→TASK without a fixed leaf type.
- The catalog/schema/validation owner stays pure and uses existing dependencies. Scoped test/review evidence does not establish whole-product numeric qualification or active configuration adoption. Retain the original pinned Bun tests, existing runtime-config-yaml/project-configuration-contract regressions, applicable typecheck and independent spec/quality review criteria.

## Task 2 — local work records, keys and hierarchy

**Status:** Source implementation and the causal readonly-frontier repair are delivered in [v0.1.9](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.9), bound to Source `b637686fe0fb41e4f9da8556eecf51ef28e3615f`. [Native delivery run 41709823990, attempt 2](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/41709823990) is completed/success: release assurance, both native targets, publisher and external Linux installation. Nine published assets match the retained publication claim. System Windows update through the public PowerShell installer has version 0.1.9 and executable SHA-256 `8c35ae9db49943053543b59b8e6711fadc3e3d1162a5c0646a792456014161d6`; version/help/resource commands pass with external runtimes unavailable. The Linux Bash/system-tools installation has the matching version and binary SHA-256 `6b78bc749be80a6893284f3a81a43673c061e6a91e2fe41bf74fee50f3dc2f7b`.

**Original runtime attempt:** the installed 0.1.9 public `--release-completed-readonly` owner completes inspect/plan/apply. Fresh public inspection of `runtime-work-records`, attempt 1, reports `INTAKE`, `execution_status:suspended`, no lease, no pending actions and `recovery_required:false`. Work revision is 2 and ledger revision is 9; journal revision 6/digest `0e2a9c831e4cf466a41cc6d2dc5a5ccd117896be91fa80b24c47c40d812749ef` is preserved. No old report is replayed, Source right granted, private state edited or Runtime acceptance inferred. This is a supported owner disposition, not a retroactive task completion.

**Check limits:** retained bounded library proof is 30 cases/332 assertions. The separately bound 76-case regression receipt is 75 pass/1 unwaived Windows file-symlink `EPERM`/888 assertions; subsequent targeted corrections have separate receipts. Scoped independent Source reviews pass. Whole-product numeric coverage/AST/CRAP/mutation, timeout causality/quiescence, main SDK-lock custody and attributable user Runtime acceptance remain open. These records do not claim an all-green regression or acceptance result. Exact receipts, the retained failed publisher attempt and its reconciled same-claim resume are under `.agent/work/runtime-project-model-implementation-20261102/resume-20261103/integration-r4/`; original public-operation receipts 17–20 are under `.agent/work/runtime-task-registration-20261103/runtime-work-records/session/`.

**Files:** create `src/work-items/key.ts`, `src/work-items/store.ts`, narrowly scoped storage/journal helpers and `schemas/local-work-item.v1.schema.json`; extend only explicit public exports/inventories needed for a real consumer. Tests: `tests/local-work-item-store.test.ts`, `tests/local-work-item-recovery.test.ts`.

**Consumes:** Task 1 catalog and `ProductDefinition`. **Produces:** `formatWorkItemKey({repository_prefix, project_prefix, type_code, number})`, async `createLocalWorkItem`, `reclassifyLocalWorkItem`, `reparentLocalWorkItem`, `resolveLocalWorkItem`. Each operation accepts explicit repository/product/store binding and returns a typed record or explicit error; no process-global product selection.

Record includes schema, internal_id, key, kind/code, product ID, number, parent_id, aliases and provider identity references. Persist current OKF concepts at `items/<internal_id>.md`; index is derived. Use existing SafeRepositoryAccess atomic operations and owner/custody patterns, not ad hoc replacement.

- Delivered scope includes typed creation/lookup, shared counters, disabled-type refusal, legacy references, configurable hierarchy, UUID identity, aliases and identity-preserving reclassification. Invalid operations preserve records; no actual user-store effects are inferred.
- Retained acceptance covers cycle/self/multi-parent/cross-product rejection, parent/child reclassification checks, parallel creation and counter/record/index faults, unique numbers, exact retry and recoverable gaps. Keep focused and work-admission/provider-binding regression and independent review criteria. The check limits above remain authoritative; no all-green suite or repeated implementation is inferred.

## Task 3 — clean-init/archive/repair effect owner

Root preflight disposition: follow the [versioned v2/preservation contract](../decisions/configuration/runtime-project-model.md#engineering-contract-clean-init-v2). C1 first adds only a pure v2 codec/schema and behavioral contract tests; v1 remains byte-identical/read-only. C2 resolves the native maintenance/admission verifier and initializer preservation seam before effects; C3 completes recovery/public CLI/help/inventory. Do not add partial-operation retire/unfence or infer native quiescence from caller data. Real repository init still waits for delivered Tasks 4–5.

C3 Source checkpoint (2026-11-05): strict plan/inspect/apply/resume/retire and reviewed publication are present. Existing gate-only admission refuses `.vida` product data before pending publication; supported apply requires captured legacy YAML. Combined native fault/recovery closed at1 executed/28 assertions/0 failures, including real archive, initializer and retirement lost acknowledgements, exact-hash resume and exact retired retry; public apply/release/retire closed at1/15/0. Raw JUnit corrects the retained Luna25 count without changing original reports. Earlier four full-path timeouts remain UNKNOWN; Root apply-01/02 remain FAIL and Root apply-03/guard-02 remain closed PASS.

Root final qualification closed R8 four cases/46 assertions, prepared two/38, publication/refusal two/58 and CLI seven/16. Together with fault and happy-path receipts these are six separate processes,17 cases/201 assertions, not one combined suite. Formatter, type-aware lint, Source/CLI/tests/tooling typechecks109/162/575/213 files, AST and public help/package inventory checks passed. Vex update completed with4147 indexed files and125 unsupported files; stale clusters were unused. Exact argv, input/driver hashes, JUnit, raw output and observed-close receipts are in `.agent/work/runtime-clean-init-c3-finish-20261105-r15/root-final-qualification-r1/summary.json` and `evidence/`; final Luna receipts are `final-writer-r1/implementation/evidence/fault-03` and `happy-01` in the same work store. Root's initial absent `src/tsconfig.json` invocation remains a closed failure; the corrected existing `tsconfig.json` route passed without Source changes.

Independent Devin review (`final-writer-r1/devin-review/report.md` in that work store) requested current-proof documentation reconciliation. Root corrected six pages under `root-doc-review-correction-r1/`; original CHANGES and25-count artifacts remain preserved. Subsequent requirements/correctness/tester results and the delivery proposal each have the required additional Devin review.

**Source/Code status:** R15 native report60 accepted the reviewed Source-only handoff. Inspection61 and `SOURCE-CLOSEOUT.json` record workflow success, resume complete, journal revision27, no pending actions, no recovery requirement and released Source rights. Implementation fingerprint is `37013132235ceb068c5d08b8508084a0f7ab3f0f6aecce07a16ce529fa304853`. Evidence remains `caller_report_consistency`, without native test-execution proof. Delivery, installation, Tasks4–5, actual init and user Runtime acceptance remain open.

**Delivery evidence:** `delivery-integration-r1/applied.json` records 22 C3/prerequisite files and preserved published Host/run owners. Preliminary combined-tree typechecks passed for109/162/575/220 files. That directory also retains `prepare-next-auth.receipt.json`, the 300s preparation UNKNOWN, and `published-baseline-readonly-r1.result.json`, the closed read-only asset-body timeout. The [canonical queue](../next-actions.md#current-delivery-state) owns the current blocker and version split. Queue reconciliation changes no executable input, but earlier byte bindings do not certify the edited document bytes.

C1 Source is integrated locally as `205157d634b99b4dd6c3d839c3bd0f5149788649` (three new files, normal commit hooks). Independent Source review is Specification MET, bounded Quality/Security PASS, Source READY; Root applied the Minor test corrections and qualified final tests9/58, with unchanged v1 journal9/32 and planner7/55 receipts. Formatter, scoped type-aware lint and four typechecks pass. This local Source component is not pushed, delivered, installed or a public effect owner. Current C2/C3 Source proof is recorded above; delivery, installed behavior and real init remain pending. All retained FAIL/UNKNOWN remain preserved.

Runtime-first correction2026-11-04: C1 was executed outside runtime. The old Task3 inspect/recovery calls did not issue or complete the current task; the missing clean-init feature alone did not establish an orchestration defect. Root requested cancellation of the external C2 planner and resumes the remaining Task3 through supported fresh/current admission and actual issue/report. Preserve C1 without replay and the original expired attempt without private edits or retroactive completion. No new external Source lane follows merely from a generic refusal.

**Files:** C1 adds `bin/consumer-clean-initialization-v2.ts`, `schemas/consumer-clean-initialization-operation.v2.schema.json` and `tests/consumer-clean-journal-v2.test.ts`; v1 stays unchanged. C2/C3 add preservation/maintenance seams, the operation/public CLI and focused apply, capture, admission and CLI tests. Fault/recovery cases live in `tests/consumer-clean-initialization-apply.test.ts`; no separate `consumer-clean-initialization-recovery.test.ts` implementation is claimed. Reuse existing safe observation, admission and initializer owners.

**Interfaces:** preserve current read-only plan capture; add explicit plan/inspect/apply/resume operations. Export `applyConsumerCleanInitialization`, `inspectConsumerCleanInitialization`, `resumeConsumerCleanInitialization` with plan identity, expected state version, authorization and exact repository bindings; typed receipts distinguish planned/applied/needs_reconciliation.

- [x] Complete C1/C2/C3 Source and the bounded Code workflow with the fault, happy-path, refusal and regression evidence above. Contract criteria still require verified managed-path beforeimages, docs/work/source/evidence preservation, unsafe/foreign/drift refusal and exact recovery without duplicate effects or false completion. Historical custody remains immutable.
- [ ] Qualify and deliver the exact reconciled release checkout, then verify external Linux/Windows installation. Historical UNKNOWN effects, dependent format adoption and broader quality debt retain their own gates.

## Task 4 — config/context adoption and Codex identity

**Status:** delivered and installed as 0.1.14 after the manifest inventory correction. Source/Code and independent focused evidence remain bounded; numeric and broader recovery qualification are open. The canonical [queue](../next-actions.md) owns release/install records and retained failures.

**Files:** `src/config/runtime-config.ts`, `project-context.ts`, `project-layout.ts`, `project-upgrade-artifacts.ts`; runtime/component schemas, config template; `bin/consumer-configuration-operation.ts`, `consumer-project-relocation.ts`, `project-mapping-contract.ts`; package manifests/maintained-source inventories/exports. Tests named in source preflight: runtime-config-yaml, project-configuration-contract, project-context-boundary, project-mapping-contract, runtime-config-repair-boundary, consumer-configuration-operation, consumer-project-relocation.

**Consumes:** Tasks 1–3. Integrate the model into the existing loader and one context resolver, retaining old-read support and exact-input binding. New strict schema fields are shipped together with the validated repair/adoption owner; do not claim fields already valid in the old published contract. Prefer a versioned target contract when it avoids changing old artifact meaning; the concrete schema dispatch must be written into this task's brief before implementation, based on actual codec ownership.

- [ ] Before writer dispatch, Root resolves schema-version transition and exact adapter signatures from Task 1–3 results; no active-artifact mutation while undecided.
- [ ] RED: old config remains readable; new explicit model resolves docs independent of code, overlapping roots return all owners, cwd does not alter resolution.
- [ ] RED: identity conversion to codex preserves provider references and refuses ambiguous ownership; active APIs/help/templates use codex; retained journals unchanged.
- [ ] Implement using existing prepare/validate/layout/configuration owners; no second resolver or silent defaults of missing prefixes/hierarchy.
- [ ] GREEN: focused existing/new tests, schema/resource parity, typecheck/static gates and independent review, including the user's required additional Devin review of Luna work.

## Task 5 — interactive init/config/help and package parity

**Status:** bounded Source/Code/tester and Source handoff accepted; current runtime 0.1.17 is published and installed. The four-entry manifest correction closes the raw clean-init helper omission. A fresh eight-process delivered consumer passes full-model init/disk reload/context, configure plan/apply/archived resume and refusal contours. Physical TTY and broader qualification remain open. The approved prefixes remain VIDA, AGENT, CODEX and POWERS.

The user explicitly approved every value of the [full setup model](../decisions/configuration/project-config.proposed.yaml) on 2026-11-08, including all document/requirements/store destinations. No path-approval gap remains. Source now has bounded JSON/YAML setup input, missing-value terminal completion, full model/map/reconcile forwarding, strict v1/v2 configure adaptation and help/resource registration. Both Code views passed; a distinct tester executed 49 cases/203 assertions, 23 legacy-adapter cases/94 assertions and three help/resource cases/61 assertions, plus strict test types (586 files, zero errors). Evidence belongs to `.agent/work/runtime-product-setup-cli-20261108-task5-r5/`, fingerprint `6c1499eee333c78e9c4dd5d670a67667b785add95c26f7a69f75b63caad187cd`.

The writer delta is 13 paths. Root's 17-path integration assembly also tracks four unchanged reviewed pure input/prompt prerequisites; three canonical docs complete main commit `d1cc2251`. Primary version 0.1.9 remains protected WIP. After complete published 0.1.15 readback, the release owner selected 0.1.16 for the accepted four-entry raw-helper correction; main commit `acb0b18b`, both native producers, recovered publication, external Linux install, all-nine readback and maintained Windows update passed. Local release journals retain their separate awaiting_assurance closeout. Evidence in `.agent/work/runtime-native-init-resource-closure-20261109-r1/` records nine closed native consumer processes and the bounded PASS. The first wrapper expected input_required from a schema/version-absent model; CLI correctly refused invalid_model. That oracle failure remains retained; a fresh valid-partial-input no-TTY follow-up passed without replaying effects. Normal staged Knip and normal push passed; direct-primary Knip retains its unchanged config hint. Historical legacy and 0.1.15 failures, physical TTY/SIGINT, numeric/CRAP/manual/full-suite/counterpart review/native TestEvidence remain gaps.

**Files:** `bin/init.ts`, `init-core.ts`, `init-configuration.ts`, `configure.ts`, `cli-metadata.ts`, `cli-command-contracts.ts`; injected prompt helper; templates and `docs/installation.md`, README/help sources. Tests: init-entrypoint-v8, initialization, configure-cli, scope-help-parity plus new prompt/setup scenarios.

**Interface:** injected async prompt port at CLI boundary; deterministic core receives complete approved choices. Init/config ask repository/product prefixes, selected product IDs, code/wiki/requirements/store mappings, enabled types and hierarchy mode/custom edges. Explicit complete CLI/config input is noninteractive; missing input with no TTY returns structured input_required.

- [x] Source semantic RED/GREEN, invalid/no-TTY/cancellation refusal and full-model forwarding; explicit choices remain unchanged.
- [x] Scripted three-product, empty-selector, overlapping-document and any/custom hierarchy cases; physical TTY/SIGINT remains unproved.
- [x] Source help and package resource registration plus v1/v2 configure plan/apply/resume adaptation through existing owners.
- [x] Bounded independent Code and focused execution above; user-authorized Luna replaces unavailable Devin. These passes do not establish numeric or global qualification.
- [x] Complete Root normal-hook main integration and owner-selected 0.1.15 formation/publication/install; retain direct-primary Knip and initial push/publication failures separately.
- [x] Correct raw helper package closure and qualify the bounded delivered full-model init/configure/refusal/resume bracket on 0.1.16; physical TTY and wider recovery remain separate gaps.

## Task 6 — temporary end-to-end acceptance and delivery

**Status:** v3 adoption is published and installed in0.1.18; its new delivered Host consumer exposed an apply transport refusal before effects (34471B plan versus32768B reader). The two-file version-aware correction has bounded Code/focused proof and requires its nextPATCH delivery plus a NEW delivered Host apply/refusal/resume/init-reconcile consumer. Prior17pre-Host consumer proof and18SDK apply/resume remain distinct. Actual repository adoption waits supported exact old-owner disposal and fresh consent/currentness/CAS/native quiescence; no DB/history reset or old-work rights. Numeric, timing, fault/full-suite/native and user Runtime evidence remain open.

- [ ] Build a qualified candidate in an isolated temp consumer; use actual CLI init/config to cover every approved field and work operation, invalid inputs, interrupted clean-init recovery and help examples. Record actual receipts/exit/hash/config bindings.
- [ ] Apply required whole-change review and test/static/resource gates with user-authorized independent Luna reviews replacing unavailable Devin. Root selects the PATCH, commits/pushes with hooks, uses the single Linux/Windows workflow and verifies public installers and exact installed version/bytes/hash/PATH/resources/commands. Reuse current matching evidence, preserve unrelated Powers commits, and never fabricate completion or replay UNKNOWN.
- [ ] Bind a normal installed-runtime work session to actual invocation, admission, issue, report, Source and lease/CAS observations. This technical evidence remains separate from user Runtime acceptance.
- [ ] After fresh delivered Host-present qualification, use the supported exact old-owner disposal and native-maintenance configure v3 adoption route with the approved model/map and fresh consent/CAS/currentness; verify actual repository bindings, preserved outputs and old work/history. Do not substitute clean-init, reset or a DB migration.
- [ ] After verified clean init, continue the existing still-current tasks as directly requested by the user on2026-11-04. Reconcile `docs/next-actions.md` with actual public runtime states, preserve predecessor/completed/UNKNOWN history, and use supported admission/disposition owners under the one-task delivery policy. No repeated implementation or retroactive completion is required to continue.
- [ ] Final report separates technical Source/tests/Delivery/native installation evidence from attributable user Runtime acceptance.

The delivered18 Host-present consumer exposed a transport defect before apply:
its valid34471B plan exceeds readPlan32768B. The two-file version-aware correction
retains legacy/setup32KiB and uses the governed8MiB v3 envelope. Original fixture
refusal and tester retention FAIL remain. Deliver the correction and qualify a
NEW Host consumer before real repository adoption; no direct effect or cache route.

## Preflight boundaries

The installed 0.1.18 closes the raw helper and canonical producer-risk prerequisites and passes the bounded native full-model init/configure/refusal/resume bracket in a fresh temporary consumer. V1 remains strict and the catalog retains seven canonical kinds. The approved model is not active repository configuration; Host-present pending-receipt adoption is implemented in the Source candidate; its delivery and fresh delivered Host qualification remain pending. Root owns its supported configuration/maintenance extension, safe old-owner disposal, wider temporary qualification and real adoption. User-authorized independent Luna roles replace unavailable Devin; prior FAIL/UNKNOWN and unmeasured qualification remain. Keep the [canonical delivery state](../next-actions.md#current-delivery-state) current.
