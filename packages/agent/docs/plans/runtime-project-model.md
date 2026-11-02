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

## Global constraints

- Target product IDs `agent`, `codex`, `powers`; no active Codex identity named `plugin`. Preserve historical attribution through explicit conversion, not text replacement of evidence.
- Runtime catalog retains canonical kinds `epic`, `feature`, `pbi`, `story`, `bug`, `task`, `research` and their provider mappings. Initial project enabled types can be a subset. Codes belong to runtime, never product overrides.
- Parent/child type combinations are generic product policy; no hardcoded PBI/BUG/TASK matrix or unconditional TASK leaf. Keep one parent, acyclic same-product containment and explicit external links.
- Stable internal UUID and number on type change; human key changes type prefix; old keys resolve to the same identity. Counter spans kinds within product, monotonic, no reuse; crash gaps allowed.
- One OKF wiki with index.md, topic research/decisions and per-area requirements; no duplicate internal/output corpus. Code/docs mappings independent and may overlap.
- Missing material init choices go to user via injected prompt boundary. Complete explicit noninteractive inputs are allowed; absent answers are not implied approval.
- Published strict-v1 active-artifact formats must not be silently widened before a supported atomic repair/adoption owner. Preserve CAS, safe filesystem, UNKNOWN, native evidence and installed-vs-Source boundaries.
- Root alone uses Git, dispatches/releases workflows, installs or resets the real repository. Workers never commit, publish, update real installed files or clean real state.
- No new external runtime for installers; Linux Bash/system tools, Windows PowerShell/system tools. Software version increments PATCH, normal candidate 0.1.9 from observed 0.1.8.

## Review focus

1. Unknown/disabled catalog codes and policy references: reject precisely without deleting readable legacy work.
2. Missing prefixes/mappings with non-TTY stdin: explicit input-required result, no hang or silent default.
3. Counter/record crash boundary and concurrent creates: no duplicated/reused number; inspect/resume preserves exact effects.
4. Reclassification under configured type edges and existing children: validate the actual product policy, preserve IDs/aliases and unchanged record on failure.
5. Clean-init archive interruption, symlinks and foreign files: retain docs/work/evidence, refuse unowned paths, verify before-images and resumability.

## Task 1 — reusable catalog and product model

**Files:** create `packages/agent/src/work-items/catalog.ts`, `packages/agent/src/config/product-model.ts`, `packages/agent/schemas/product-model.v1.schema.json`; tests `tests/work-item-catalog.test.ts`, `tests/product-model.test.ts`. Reuse existing canonical-kind type with backwards-compatible re-export as needed; do not change active runtime-config v1 validation in this task.

**Interfaces:** runtime-owned readonly catalog maps each existing canonical kind to one stable uppercase code. Export `getWorkItemType(kindOrCode: string)` returning its catalog entry or undefined. Export Zod `productModelSchema` and inferred `ProductModelDefinition`, `ProductDefinition`, `ProductHierarchyPolicy`; `validateProductHierarchy(policy, enabledTypes)` validates references, and `isChildTypeAllowed(policy, parentCode, childCode)` handles `any` or `custom`.

Model mirrors approved YAML: repository id/prefix, projects with id/prefix/source selectors, documents root/index/requirements root/areas/research/decisions, work_items storage_root/enabled_types/hierarchy. Hierarchy is discriminated `{mode:'any'}` or `{mode:'custom', allowed_children: Record<string,string[]>}`. In custom mode a missing parent entry allows no child; unknown/disabled codes are invalid config. In any mode all enabled type pairs are allowed. Topology validation is a later store responsibility.

- [ ] RED: assert all seven existing kinds map consistently; unknown code fails; duplicate prefixes/IDs, malformed paths and inconsistent policy references fail; explicit codex accepted.
- [ ] RED: configure TASK→PBI, BUG→BUG and PBI→TASK in one product, forbid one pair in another; assert data-driven behavior with no special leaf type.
- [ ] Implement the catalog/schema/validation owner using existing dependencies. Keep policy parsing pure and deterministic; no filesystem writes.
- [ ] GREEN: pinned Bun targeted new tests plus existing runtime-config-yaml/project-configuration-contract regressions; package typecheck as applicable.
- [ ] Root captures diff/evidence; fresh OpenCode spec+quality review before integration.

## Task 2 — local work records, keys and hierarchy

**Files:** create `src/work-items/key.ts`, `src/work-items/store.ts`, narrowly scoped storage/journal helpers and `schemas/local-work-item.v1.schema.json`; extend only explicit public exports/inventories needed for a real consumer. Tests: `tests/local-work-item-store.test.ts`, `tests/local-work-item-recovery.test.ts`.

**Consumes:** Task 1 catalog and `ProductDefinition`. **Produces:** `formatWorkItemKey({repository_prefix, project_prefix, type_code, number})`, async `createLocalWorkItem`, `reclassifyLocalWorkItem`, `reparentLocalWorkItem`, `resolveLocalWorkItem`. Each operation accepts explicit repository/product/store binding and returns a typed record or explicit error; no process-global product selection.

Record includes schema, internal_id, key, kind/code, product ID, number, parent_id, aliases and provider identity references. Persist current OKF concepts at `items/<internal_id>.md`; index is derived. Use existing SafeRepositoryAccess atomic operations and owner/custody patterns, not ad hoc replacement.

- [ ] RED: creation/lookup/typed keys, per-product shared counter and disabled-type creation; legacy provider IDs retained.
- [ ] RED: arbitrary configured edges, cycle/self/multi-parent/cross-product rejection; reclassification checks both parent and children.
- [ ] RED: parallel creates plus injected faults around counter reservation/record/index; assert unique non-reused numbers, exact retry and recoverable gaps.
- [ ] Implement store and typed operations with UUID identity, alias uniqueness and preserved record on invalid reclassification. No actual user-store effects.
- [ ] GREEN: new focused tests and existing work-admission/provider-binding regressions; OpenCode review.

## Task 3 — clean-init/archive/repair effect owner

**Files:** extend `bin/consumer-clean-initialization.ts` and its schema/state owner; add focused contract/CLI helpers and tests `tests/consumer-clean-initialization-apply.test.ts`, `tests/consumer-clean-initialization-recovery.test.ts`. Reuse existing capture planner and SafeRepositoryAccess.

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

- [ ] Build a qualified candidate in an isolated temp consumer; use actual CLI init/config to cover every approved field and work operation, invalid inputs, interrupted clean-init recovery and help examples. Record actual receipts/exit/hash/config bindings.
- [ ] Fresh whole-change OpenCode review, required test/static/resource checks; preserve failures and fix through assigned Luna writer.
- [ ] Root normal commits/push with hooks; bump runtime/manifest/executable consistently by PATCH and bind exact Source. Reconcile pre-existing Powers commits without overwriting them.
- [ ] Root prepares supported controller request and dispatches the single native-delivery workflow for assurance, Linux/Windows builds and publication. Observe exact assets, Source, version, hashes and terminal jobs; no fake completed workflow or blind retry.
- [ ] Download public external installer, update installed Windows runtime through its owner, verify structured receipt/bytes/hash/PATH/resources and actual commands.
- [ ] With approved clean-init scope and actual user answers, inventory/backup managed integration and real state; clean-init using qualified delivered owner, configure all products and verify bindings/docs/work preservation.
- [ ] Final report separates technical Source/tests/Delivery/native installation evidence from attributable user Runtime acceptance.

## Preflight boundaries

Root observed clean-init is planner-only, schema v1 strict, seven canonical kinds, no general typed local work store and no prompt port. Those are implementation gaps, not passing evidence. The schema integration decision in Task 4 is intentionally a gated future brief, not authorization to guess now; Task 1 is self-contained and executable without it. Each task gets a fresh scoped Luna writer and fresh OpenCode reviewer; only Root integrates commits and updates the ledger.
