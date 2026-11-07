---
type: Implementation Plan
title: Runtime product model implementation
---

# Runtime product model implementation plan

> For agentic workers: use subagent-driven development task by task. Luna implements; OpenCode DeepSeek V4.1 Flash validates; Root owns Git and native/publication effects. User already authorized execution; do not ask again for a routine plan/execution choice.

**Goal:** implement the approved product/wiki/work-item model, qualify temporary CLI setup, release the next PATCH, externally update Windows runtime and safely clean-initialize this repository.

**Architecture:** one runtime catalog and generic product-policy model; existing config/context and safe-filesystem owners consume it. Work records have stable UUIDs, typed keys, aliases and product-configured hierarchy. Existing repair/configuration owners govern schema/adoption and clean reset.

**Tech stack:** pinned Bun 1.4.4, existing TypeScript/Zod/Ajv/YAML/fs-safe dependencies; native Linux/Windows release workflow; Bash/PowerShell external installers.

**Spec:** [approved model with annotations](../decisions/configuration/runtime-project-model.md), [clean-init authorization](../decisions/configuration/clean-init-authorization.md). Derived execution record: `.agent/work/runtime-project-model-implementation-20261102/WORK.md`.

## Execution cycles

Follow the [one-task runtime-first delivery cycle](../decisions/work-items/runtime-first-development.md). This plan describes the full program; it is not one release batch. Start one task through the installed runtime. If a demonstrated runtime defect blocks it, fix only that defect and finish the same task outside runtime. Qualify, deliver a new PATCH build, update the system runtime, and reconcile Markdown before starting the next task through that updated runtime.

Task 2 (`runtime-work-records`) Source and the demonstrated readonly-frontier repair are delivered in v0.1.9; its original runtime attempt has the supported suspended disposition described below. Task 1 is an integrated dependency. Tasks 3–6 remain queued for delivery; Task 3 C3 Source work is in progress and not complete. Preserve mandatory release gates. An unrelated gate is a reported delivery blocker, not permission to skip checks or silently add other tasks. Track Source completion, the retained runtime attempt, and actual delivery separately.

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
- No new external runtime for installers; Linux Bash/system tools, Windows PowerShell/system tools. Software version increments PATCH. Published and system-installed runtime version is 0.1.9; the next candidate is selected by the existing owner from live state, normally 0.1.10.

## Review focus

1. Unknown/disabled catalog codes and policy references: reject precisely without deleting readable legacy work.
2. Missing prefixes/mappings with non-TTY stdin: explicit input-required result, no hang or silent default.
3. Counter/record crash boundary and concurrent creates: no duplicated/reused number; inspect/resume preserves exact effects.
4. Reclassification under configured type edges and existing children: validate the actual product policy, preserve IDs/aliases and unchanged record on failure.
5. Clean-init archive interruption, symlinks and foreign files: retain docs/work/evidence, refuse unowned paths, verify before-images and resumability.

## Task 1 — reusable catalog and product model

**Files:** create `packages/agent/src/work-items/catalog.ts`, `packages/agent/src/config/product-model.ts`, `packages/agent/schemas/product-model.v1.schema.json`; tests `tests/work-item-catalog.test.ts`, `tests/product-model.test.ts`. Conditionally modify `src/config/runtime-config.ts` only to centralize/re-export its canonical-kind type without changing behavior. Do not change active runtime-config v1 validation.

**Interfaces:** runtime-owned frozen `{kind, code}` catalog retains seven kinds and their uppercase codes. `getWorkItemType(kindOrCode: string)` matches exact lowercase kind or uppercase code; other casing/unknown returns undefined. Export Zod `productModelSchema` and inferred `ProductModelDefinition`, `ProductDefinition`, `ProductHierarchyPolicy`. `validateProductHierarchy(policy, enabledTypes)` validates references; `isChildTypeAllowed(policy, enabledTypes, parentCode, childCode)` requires explicit enabled-set context.

Model mirrors approved YAML: repository id/prefix, projects with id/prefix/source selectors, documents root/index/requirements root/areas/research/decisions, work_items storage_root/enabled_types/hierarchy. Hierarchy is discriminated `{mode:'any'}` or `{mode:'custom', allowed_children: Record<string,string[]>}`. Export `isChildTypeAllowed(policy, enabledTypes, parentCode, childCode)` with explicit enabled-type context. In custom mode a missing parent entry allows no child; unknown/disabled codes are invalid config. In any mode all enabled type pairs are allowed. Topology validation is a later store responsibility.

Exact envelope: required `schema: 'ProductModel/v1'`, `version: 1`, `repository: {repository_id, prefix}`, and nonempty `projects`. Each project requires `project_id`, `title`, `prefix`, `project_root`, `code_selectors`, `documents: {root,index,requirements:{root,areas:{<id>:{business,system,acceptance,test_cases}}},research,decisions}`, and `work_items: {storage_root,enabled_types,hierarchy}`. No silent defaults. The YAML proposal is a shape reference pending real hierarchy answers, not a complete valid fixture.

Hierarchy is required; any-mode must be explicit. Empty custom map is valid and permits no children; duplicate array entries are invalid. `enabled_types`, `code_selectors` and requirements `areas` may be empty, with later operation readiness checks. Duplicate object keys are a raw loader/parser concern, not detectable after parsed input.

Zod is the semantic authority for Task 1; JSON Schema is a declarative integration artifact for Task 4. Add a parity fixture set for envelope, required hierarchy/modes, enum membership and additional-property rejection; contextual enabled references remain semantic checks. Do not register the artifact as an active v1 resource yet. Report deferred package schema inventories and runtime resource-list registration explicitly.

Path validation follows the existing pure rules at `src/config/project-context.ts:356-372` and its `invalidPathSegment` dependency. A pure local helper must preserve those rules without importing project-context or doing filesystem I/O. Directory/file path fields use it; code_selectors are nonempty strings with existing glob syntax and are not subjected to the no-wildcard path rule. Prefix regex is `^[A-Z][A-Z0-9]*$`.

- [ ] RED: assert all seven existing kinds map consistently; unknown code fails; duplicate prefixes/IDs, malformed paths and inconsistent policy references fail; explicit codex accepted.
- [ ] RED: configure TASK→PBI, BUG→BUG and PBI→TASK in one product, forbid one pair in another; assert data-driven behavior with no special leaf type.
- [ ] Implement the catalog/schema/validation owner using existing dependencies. Keep policy parsing pure and deterministic; no filesystem writes.
- [ ] GREEN: pinned Bun targeted new tests plus existing runtime-config-yaml/project-configuration-contract regressions; package typecheck as applicable.
- [ ] Root captures diff/evidence; fresh OpenCode spec+quality review before integration.

## Task 2 — local work records, keys and hierarchy

**Status:** Source implementation and the causal readonly-frontier repair are delivered in [v0.1.9](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.9), bound to Source `b637686fe0fb41e4f9da8556eecf51ef28e3615f`. [Native delivery run 41709823990, attempt 2](https://github.com/pomazanbohdan/vida-stack-lite/actions/runs/41709823990) is completed/success: release assurance, both native targets, publisher and external Linux installation. Nine published assets match the retained publication claim. System Windows update through the public PowerShell installer has version 0.1.9 and executable SHA-256 `8c35ae9db49943053543b59b8e6711fadc3e3d1162a5c0646a792456014161d6`; version/help/resource commands pass with external runtimes unavailable. The Linux Bash/system-tools installation has the matching version and binary SHA-256 `6b78bc749be80a6893284f3a81a43673c061e6a91e2fe41bf74fee50f3dc2f7b`.

**Original runtime attempt:** the installed 0.1.9 public `--release-completed-readonly` owner completes inspect/plan/apply. Fresh public inspection of `runtime-work-records`, attempt 1, reports `INTAKE`, `execution_status:suspended`, no lease, no pending actions and `recovery_required:false`. Work revision is 2 and ledger revision is 9; journal revision 6/digest `0e2a9c831e4cf466a41cc6d2dc5a5ccd117896be91fa80b24c47c40d812749ef` is preserved. No old report is replayed, Source right granted, private state edited or Runtime acceptance inferred. This is a supported owner disposition, not a retroactive task completion.

**Check limits:** retained bounded library proof is 30 cases/332 assertions. The separately bound 76-case regression receipt is 75 pass/1 unwaived Windows file-symlink `EPERM`/888 assertions; subsequent targeted corrections have separate receipts. Scoped independent Source reviews pass. Whole-product numeric coverage/AST/CRAP/mutation, timeout causality/quiescence, main SDK-lock custody and attributable user Runtime acceptance remain open. These records do not claim an all-green regression or acceptance result. Exact receipts, the retained failed publisher attempt and its reconciled same-claim resume are under `.agent/work/runtime-project-model-implementation-20261102/resume-20261103/integration-r4/`; original public-operation receipts 17–20 are under `.agent/work/runtime-task-registration-20261103/runtime-work-records/session/`.

**Files:** create `src/work-items/key.ts`, `src/work-items/store.ts`, narrowly scoped storage/journal helpers and `schemas/local-work-item.v1.schema.json`; extend only explicit public exports/inventories needed for a real consumer. Tests: `tests/local-work-item-store.test.ts`, `tests/local-work-item-recovery.test.ts`.

**Consumes:** Task 1 catalog and `ProductDefinition`. **Produces:** `formatWorkItemKey({repository_prefix, project_prefix, type_code, number})`, async `createLocalWorkItem`, `reclassifyLocalWorkItem`, `reparentLocalWorkItem`, `resolveLocalWorkItem`. Each operation accepts explicit repository/product/store binding and returns a typed record or explicit error; no process-global product selection.

Record includes schema, internal_id, key, kind/code, product ID, number, parent_id, aliases and provider identity references. Persist current OKF concepts at `items/<internal_id>.md`; index is derived. Use existing SafeRepositoryAccess atomic operations and owner/custody patterns, not ad hoc replacement.

- [ ] RED: creation/lookup/typed keys, per-product shared counter and disabled-type creation; legacy provider IDs retained.
- [ ] RED: arbitrary configured edges, cycle/self/multi-parent/cross-product rejection; reclassification checks both parent and children.
- [ ] RED: parallel creates plus injected faults around counter reservation/record/index; assert unique non-reused numbers, exact retry and recoverable gaps.
- [x] Implement store and typed operations with UUID identity, alias uniqueness and preserved record on invalid reclassification. No actual user-store effects.
- [ ] GREEN: new focused tests and existing work-admission/provider-binding regressions; OpenCode review.

## Task 3 — clean-init/archive/repair effect owner

Root preflight disposition: follow the [versioned v2/preservation contract](../decisions/configuration/runtime-project-model.md#engineering-contract-clean-init-v2). C1 first adds only a pure v2 codec/schema and behavioral contract tests; v1 remains byte-identical/read-only. C2 resolves the native maintenance/admission verifier and initializer preservation seam before effects; C3 completes recovery/public CLI/help/inventory. Do not add partial-operation retire/unfence or infer native quiescence from caller data. Real repository init still waits for delivered Tasks 4–5.

C3 Source checkpoint (2026-11-05): strict plan/inspect/apply/resume/retire and reviewed publication are present. Existing gate-only admission refuses `.vida` product data before pending publication; supported apply requires captured legacy YAML. Combined native fault/recovery closed at1 executed/28 assertions/0 failures, including real archive, initializer and retirement lost acknowledgements, exact-hash resume and exact retired retry; public apply/release/retire closed at1/15/0. Raw JUnit corrects the retained Luna25 count without changing original reports. Earlier four full-path timeouts remain UNKNOWN; Root apply-01/02 remain FAIL and Root apply-03/guard-02 remain closed PASS.

Root final qualification closed R8 four cases/46 assertions, prepared two/38, publication/refusal two/58 and CLI seven/16. Together with fault and happy-path receipts these are six separate processes,17 cases/201 assertions, not one combined suite. Formatter, type-aware lint, Source/CLI/tests/tooling typechecks109/162/575/213 files, AST and public help/package inventory checks passed. Vex update completed with4147 indexed files and125 unsupported files; stale clusters were unused. Exact argv, input/driver hashes, JUnit, raw output and observed-close receipts are in `.agent/work/runtime-clean-init-c3-finish-20261105-r15/root-final-qualification-r1/summary.json` and `evidence/`; final Luna receipts are `final-writer-r1/implementation/evidence/fault-03` and `happy-01` in the same work store. Root's initial absent `src/tsconfig.json` invocation remains a closed failure; the corrected existing `tsconfig.json` route passed without Source changes.

Independent Devin review (`final-writer-r1/devin-review/report.md` in that work store) found bounded implementation/quality/security PASS and requested current-proof documentation reconciliation. Root corrected the six stale pages with separate attribution under `root-doc-review-correction-r1/`; original CHANGES and25-count artifacts remain preserved. This docs-only correction changes no executable input. Native Source/Code closeout, scoped delivery, installation, Tasks4-5 activation, real repository initialization and attributable Runtime acceptance remain open. Source package0.1.9 and installed runtime0.1.11 remain separate.

C1 Source is integrated locally as `205157d634b99b4dd6c3d839c3bd0f5149788649` (three new files, normal commit hooks). Independent Source review is Specification MET, bounded Quality/Security PASS, Source READY; Root applied the Minor test corrections and qualified final tests9/58, with unchanged v1 journal9/32 and planner7/55 receipts. Formatter, scoped type-aware lint and four typechecks pass. This local Source component is not pushed, delivered, installed or a public effect owner. Current C2/C3 Source proof is recorded above; delivery, installed behavior and real init remain pending. All retained FAIL/UNKNOWN remain preserved.

Runtime-first correction2026-11-04: C1 was executed outside runtime. The old Task3 inspect/recovery calls did not issue or complete the current task; the missing clean-init feature alone did not establish an orchestration defect. Root requested cancellation of the external C2 planner and resumes the remaining Task3 through supported fresh/current admission and actual issue/report. Preserve C1 without replay and the original expired attempt without private edits or retroactive completion. No new external Source lane follows merely from a generic refusal.

**Files:** C1 creates `bin/consumer-clean-initialization-v2.ts`, `schemas/consumer-clean-initialization-operation.v2.schema.json` and `tests/consumer-clean-journal-v2.test.ts`; existing v1 module/schema stay unchanged. C2/C3 add the preservation/maintenance seams, effect/public CLI and focused tests `tests/consumer-clean-initialization-apply.test.ts`, `tests/consumer-clean-initialization-recovery.test.ts`. Reuse existing safe observation, admission and initializer owners.

**Interfaces:** preserve current read-only plan capture; add explicit plan/inspect/apply/resume operations. Export `applyConsumerCleanInitialization`, `inspectConsumerCleanInitialization`, `resumeConsumerCleanInitialization` with plan identity, expected state version, authorization and exact repository bindings; typed receipts distinguish planned/applied/needs_reconciliation.

- [ ] RED: known managed paths archived with verified hashes and before-images; docs/work/source/evidence untouched; reject foreign identity, changed before-image, expired/unknown effects and unsafe paths.
- [ ] RED: fault each archive/init phase, then inspect/resume; no blind duplicate move/init and no false completed receipt.
- [ ] Implement narrowly scoped archive/apply/recovery owner. Keep retained historical custody immutable. Pair active-artifact repair before dependent format adoption.
- [ ] GREEN: targeted recovery and safe-fs tests; package typecheck and OpenCode review. Only disposable fixture roots used.

## Task 4 — config/context adoption and Codex identity

**Files:** `src/config/runtime-config.ts`, `project-context.ts`, `project-layout.ts`, `project-upgrade-artifacts.ts`; runtime/component schemas, config template; `bin/consumer-configuration-operation.ts`, `consumer-project-relocation.ts`, `project-mapping-contract.ts`; package manifests/maintained-source inventories/exports. Tests named in source preflight: runtime-config-yaml, project-configuration-contract, project-context-boundary, project-mapping-contract, runtime-config-repair-boundary, consumer-configuration-operation, consumer-project-relocation.

**Consumes:** Tasks 1–3. Integrate the model into the existing loader and one context resolver, retaining old-read support and exact-input binding. New strict schema fields are shipped together with the validated repair/adoption owner; do not claim fields already valid in the old published contract. Prefer a versioned target contract when it avoids changing old artifact meaning; the concrete schema dispatch must be written into this task's brief before implementation, based on actual codec ownership.

- [ ] Before writer dispatch, Root resolves schema-version transition and exact adapter signatures from Task 1–3 results; no active-artifact mutation while undecided.
- [ ] RED: old config remains readable; new explicit model resolves docs independent of code, overlapping roots return all owners, cwd does not alter resolution.
- [ ] RED: identity conversion to codex preserves provider references and refuses ambiguous ownership; active APIs/help/templates use codex; retained journals unchanged.
- [ ] Implement using existing prepare/validate/layout/configuration owners; no second resolver or silent defaults of missing prefixes/hierarchy.
- [ ] GREEN: focused existing/new tests, schema/resource parity, typecheck/static gates; OpenCode review before integration.

## Task 5 — interactive init/config/help and package parity

**Files:** `bin/init.ts`, `init-core.ts`, `init-configuration.ts`, `configure.ts`, `cli-metadata.ts`, `cli-command-contracts.ts`; injected prompt helper; templates and `docs/installation.md`, README/help sources. Tests: init-entrypoint-v8, initialization, configure-cli, scope-help-parity plus new prompt/setup scenarios.

**Interface:** injected async prompt port at CLI boundary; deterministic core receives complete approved choices. Init/config ask repository/product prefixes, selected product IDs, code/wiki/requirements/store mappings, enabled types and hierarchy mode/custom edges. Explicit complete CLI/config input is noninteractive; missing input with no TTY returns structured input_required.

- [ ] RED: interactive choices reach exact config; refused prefix is not written; incomplete noninteractive input never hangs/defaults.
- [ ] RED: all three product setup including Codex empty Source and independent/overlapping document roots; any/custom hierarchy prompts tested with scripted user responses.
- [ ] Implement help for first init, inspect/plan/apply/resume, product setup, generic hierarchy and authorized clean init. CLI/source/native help parity and portable asset inventory required.
- [ ] GREEN: focused CLI tests, package exports/resources/standalone regression checks; OpenCode review.

## Task 6 — temporary end-to-end acceptance and delivery

This task owns final acceptance and adoption of the complete product model. Its full-model scenarios wait for their feature dependencies. They do not postpone each earlier task's scoped PATCH delivery. Repeat the applicable existing release/install checks for each one-task cycle; do not claim unimplemented init/configuration/reset scenarios in a Task 2 release.

- [ ] Build a qualified candidate in an isolated temp consumer; use actual CLI init/config to cover every approved field and work operation, invalid inputs, interrupted clean-init recovery and help examples. Record actual receipts/exit/hash/config bindings.
- [ ] Fresh whole-change OpenCode review, required test/static/resource checks; preserve failures and fix through assigned Luna writer.
- [ ] Root normal commits/push with hooks; bump runtime/manifest/executable consistently by PATCH and bind exact Source. Reconcile pre-existing Powers commits without overwriting them.
- [ ] Root prepares supported controller request and dispatches the single native-delivery workflow for assurance, Linux/Windows builds and publication. Observe exact assets, Source, version, hashes and terminal jobs; no fake completed workflow or blind retry.
- [ ] Download public external installer, update installed Windows runtime through its owner, verify structured receipt/bytes/hash/PATH/resources and actual commands.
- [ ] With approved clean-init scope and actual user answers, inventory/backup managed integration and real state; clean-init using qualified delivered owner, configure all products and verify bindings/docs/work preservation.
- [ ] After verified clean init, continue the existing still-current tasks as directly requested by the user on2026-11-04. Reconcile `docs/next-actions.md` with actual public runtime states, preserve predecessor/completed/UNKNOWN history, and use supported admission/disposition owners under the one-task delivery policy. No repeated implementation or retroactive completion is required to continue.
- [ ] Final report separates technical Source/tests/Delivery/native installation evidence from attributable user Runtime acceptance.

## Preflight boundaries

Clean-init remains planner-only, active schema v1 remains strict, the catalog retains seven canonical kinds and an interactive prompt port is not implemented. The reusable product model and typed local work store are implemented Source; their active configuration/CLI adoption remains in Tasks 4–5. The schema integration decision in Task 4 is intentionally a gated future brief, not authorization to guess now. Each task gets a fresh scoped Luna writer and fresh OpenCode reviewer; only Root integrates commits and updates the ledger. Preserve the next-cycle publication-preparation guard gap in [next actions](../next-actions.md#remaining-work-outside-the-implementation-plan) before using that route.
