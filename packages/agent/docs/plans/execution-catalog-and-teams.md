---
type: Implementation Plan
title: Execution catalog and teams
---

# Execution catalog and teams implementation plan

> **For agentic workers:** use superpowers:executing-plans for Root implementation task-by-task. Independent research/review/test agents receive bounded read-only scopes. Steps use checkboxes; this plan issues no Source rights.

**Goal:** initialize one editable local execution catalog and run one generic research-to-delivery chain through three team compositions, plus one fixed VIDA chain.

**Architecture:** existing config codec/compiler, Mastra snapshot, HostState/journal/CAS, Cedar and operation owners remain authoritative. A temporary repair checkpoint converts declared consumers to one final config format; the final bundle removes its old readers and the repair tool. No second scheduler, settings store or effect ledger.

**Tech stack:** current pinned Bun/TypeScript, existing schemas/Zod validation, Mastra/LibSQL, HostState, Cedar, native CLI/release owners; no new framework/dependency.

**Spec:** [approved architecture](../research/configuration/execution-catalog-and-teams.md), [decisions](../decisions/configuration/execution-catalog-and-teams.md), [system behavior](../system-specification.md#dynamic-engine-requirements). This plan is derived; changes to observable intent return to those owners.

Status: implementation NOT_RUN. User approved the split/origin/metadata/product-routing revision on 2026-11-10 and requested implementation through repository init preserving current settings. User selected Devin/swe-2-flash-medium for development and Codex/gpt-6-luna at max for validations. Previous frozen-plan PASS binds the earlier layout only. Requested SWE-2 Flash and DeepSeek 4.1 Flash split reviews completed APPROVE_WITH_CHANGES; Root corrected three Important. Those corrections are not a new independent PASS. Historical reports/inputs retained.

## Runtime-first delivery cycles

Follow [one task per runtime-first delivery cycle](../decisions/work-items/runtime-first-development.md). This is the whole program's dependency map, not permission to implement all tasks before the first release. Task 0 is the repeated pre-Source gate; start with one admitted Task 1 work, then only its causal prerequisites. Obtain supported admission → issue → actual tool result → report on the installed runtime. A correct refusal, missing permission or future feature is not a proven runtime defect and grants no fallback.

Each implementation task ends with its bounded accepted deliverable, normal Root integration, owner-selected PATCH delivery/system update and current Markdown before the next task begins through that updated runtime. Tasks 1–8 may deliver pure final-value/repair/qualification capabilities without activating final cfg; they must leave the ordinary current reader usable on its current selected format. There is no ordinary old/new fallback. If a task cannot be delivered without an unqualified schema switch or an independent task's implementation, record that concrete dependency and reconcile scope through its owner before writing; do not silently execute the remainder of this plan.

The final selection/admission schema and all live caller wiring stay with the current runtime through Tasks 1–8. Task 9 alone switches the ordinary reader, configured selection/admission and affected callers to the final contracts after Task 4 repair qualification and the cohort's terminal/no-pending gate. Before then, final-value parsers, obligation checks, routing functions, actor policy and graph/CLI contracts can be built and verified in isolation; they do not select live Work or activate final cfg. A stable pure SDK export is permitted if qualified and it is not an ordinary configuration reader or a second engine. Legacy removal accompanies the same cutover.

Task 4 delivers the qualified temporary repair checkpoint; Task 9 is the separately gated adoption/final-removal transition. No earlier task changes live config merely to make its tests or new API reachable. Task 10 verifies the delivered full chain and remaining acceptance; it does not repeat completed implementation. Any demonstrated causal runtime fix follows the same narrow repair, delivery and updated-runtime continuation policy. Root keeps the public native release gates and version selection with their existing owner in every cycle.

## Global constraints

- Final identifiers: VidaProjectConfig, ExecutionCatalogComponent, ExecutionCatalogEnablement, ExecutionRouting → AgentRuntimeConfig; final ConsumerConfigurationOperation. No transitional v2/v3, alias, dual-read or compatibility matrix.
- One final config layout: project manifest + 5 package/5 custom components (roles/profiles/tasks/teams/workflows), catalog/enabled.yaml and routing.yaml: 13 exact files. No agents/flows umbrella, globs or shadow lookup. Physical DB identities/paths remain unchanged; do not flip legacyStorageOverlapExcluded or merge databases.
- Package defaults: generic-development and vida-development; explicit custom bindings use the same obligations. Legacy five workflows become non-executable immutable evidence after supported disposition.
- Immutable route selection: allowed explicit route > product kind > product default > global kind > global default. Whole named route, not field merge; level = explicit Work level or chosen route default, team from its level map. Multi-product targets must match or refuse. No silent escalation.
- completion_profile = source_only/artifact/deployment; frozen before dispatch. Deployment requires actual verified target; proposal alone cannot satisfy it.
- TestPlan/v1 precedes Source; DeliveryEvidence/v1 is a projection, not another effect owner.
- One develop stage and one Source writer per compiled Work; correction re-enters that node. Independent Works may run concurrently with existing exact-path serialization.
- Enabled is the sole local-only map in catalog/enabled.yaml for both origins. Package update preserves existing switches/custom bytes; new incoming entries disabled pending explicit enable. Full cfg/plan hashes include it; body hashes exclude it.
- Entry provenance has one home: project.catalog_provenance[origin][kind][id], referencing file_id/body digest/derived_from. File meta owns source/version and stable ID/revision/UTC timestamps; timestamps are not currentness/CAS proof.
- Preserve immutable authorization, packets/results/history/provider metadata and FAIL/UNKNOWN; old records are not rewritten to claim new rights or approval.
- Keep TESTING.md scope/coverage/frozen complexity/CRAP rules. Mutation needs separate explicit authorization. Missing numeric/native proof stays a GAP; do not invent extra release/formation gates.
- Root owns canonical docs, package registration, main integration and release coordination. Protected WIP/version values remain; owner selects next PATCH from actual published baseline.

## Review focus

1. Old configure/init pending records survive a binary update: Task 4 must refuse cutover for configuration_pending, legacy_initialization_pending, unknown_pending and unresolved bound archive refs.
2. A package security/body update follows local disable: Task 2 must preserve enabled=false, avoid a false body conflict and invalidate the effective plan correctly.
3. A late result arrives from an old catalog/actor/generation: Tasks 5/6 must reject it without clearing the live operation fence or acquiring rights.
4. Deploy completes but its acknowledgement/readback is lost: Task 7 must inspect the exact same owner operation, never issue a second possible effect.
5. Monolithic config changes to split files while DBs contain real history: Tasks 3/4/9 must retain physical DB identity/data and refuse unsupported opener/maintenance states.

## File and owner map

Paths below are relative to packages/agent unless prefixed otherwise. They are prospective task boundaries, not a write lease. Task 0 freezes exact current preimages and affected caller closure before each Source issue.

| Owner | Existing paths | New final paths / temporary paths |
| --- | --- | --- |
| Catalog parsing/update/routing | src/config/runtime-config.ts, project-configuration.ts | src/config/execution-catalog.ts; execution-catalog-merge.ts; execution-routing.ts; schemas/agent-runtime-config.schema.json; project-configuration.schema.json; execution-catalog-component.schema.json; execution-catalog-enablement.schema.json; execution-routing.schema.json |
| Planner | src/orchestration/workflow-plan.ts; mastra-boundary.ts; src/config/runtime-config.ts | src/orchestration/workflow-obligations.ts; test-plan.ts; schemas/test-plan.v1.schema.json |
| State/effect authority | src/host-state.ts; src/authorization/cedar-boundary.ts; src/runtime-kernel.ts; src/orchestration/local-work-admission.ts, persistent-session-handoff.ts, mastra-session-bridge.ts, mastra-session-bridge-contract.ts, session-handoff.ts, final-assurance.ts | Existing configured Cedar policy/schema resources discovered and frozen in Task 0; no second principal/ledger |
| Config/storage activation | bin/init-configuration.ts, consumer-configuration-operation.ts, consumer-configuration-adoption.ts, init-core.ts, reconcile-artifacts.ts; src/config/project-paths.ts, project-layout.ts, project-configuration-rebind.ts, clean-initialization-admission.ts | bin/execution-catalog-repair.ts TEMPORARY; schemas/consumer-configuration-operation.schema.json |
| Delivery | src/runtime-kernel.ts; src/orchestration/final-assurance.ts; bin/release-preparation.ts; existing native release/installer owners | src/orchestration/delivery-evidence.ts; schemas/delivery-evidence.v1.schema.json |
| Package/CLI | bin/configure.ts, init.ts, vida-agent.ts, cli-command-contracts.ts, cli-metadata.ts; package.json; tooling/maintained-source-inventory.ts; src/index.ts | templates/project.template.yaml; templates/catalog/package/{roles,profiles,tasks,teams,workflows}.yaml; valid seeded routing/enablement; only five custom envelopes start with entries: {} |
| Tests | Existing config/workflow/Host/session/Cedar/init/configure/package tests | tests/execution-catalog-contract.test.ts; execution-catalog-merge.test.ts; execution-catalog-compiler.test.ts; execution-catalog-repair.test.ts (temporary repair tests); execution-catalog-activation.test.ts; execution-catalog-delivery.test.ts; execution-catalog-consumer.test.ts |
| Documentation | docs/system-specification.md; research/decisions/configuration/execution-catalog-and-teams.md; docs/installation.md; docs/next-actions.md | This single implementation plan; retained evidence under the existing work record |

Do not add an execution-plan.json, catalog settings database, scheduler, new root planning tree, generic plugin loader or parallel inventory. Existing tooling/function-inventory.ts owns callable correspondence. A newly discovered necessary caller enters the exact task scope through Root's normal scope reconciliation before its edit.

## Checks and evidence conventions

Run package commands from packages/agent. `bun bin/bun.ts` is the maintained pin wrapper; verify its Bun identity before the first execution. All focused cases retain the current 5000 ms test bound.

- Focused command: `bun bin/bun.ts test --timeout 5000 <explicit test paths>`. Record real case names, nonempty selection, raw outputs/JUnit with an absolute destination, exit/process closure and unchanged declared inputs.
- Existing control groups: `bun run test:config`, `bun run test:host-state`, `bun run test:run-entrypoint`, plus explicit affected session/Cedar/package cases. Do not rerun all groups after a docs-only fix.
- Statics on final bytes: `bun run typecheck`, `bun run lint`, `bun run format:check`; strict `bun run lint:knip` through its normal owner. Run the root `ast-grep scan --config sgconfig.yml`; refresh Vex and inspect changed symbols/callers.
- Use TESTING.md's existing coverage/CRAP producer and reviewed source/function map. Do not auto-launch mutation. Normal hooks and maintained platform publication assurance remain required where applicable.
- RED must fail the named new behavior, not a missing fixture/JUnit directory. GREEN/control receipts retain separate authorship. A passing reviewer report is not native TestEvidence or user acceptance.
- Commit/release only through Root's separately authorized normal owner; no automatic per-task push, force, no-verify or WIP reset.

## Task 0 — Freeze the execution boundary and causal prerequisites

**Files:** existing work record .agent/work/runtime-execution-catalog-design-20261109/WORK.md and derived scope/caller/evidence manifests there; product Source read-only.

**Interfaces:** produces an exact per-task scope with current head/index/preimages, caller map, callable budgets, scenario IDs and current installed-owner prerequisites. No writer is implied by this artifact.

- [ ] Inspect current queue: disposition demonstrated causal P0 bugs before P1 optimizations before P2 catalog; unrelated/global proof debt is not invented as a new catalog dependency.
- [ ] Resolve installed lifecycle/allocation owner, actual work/admission, approved intent and exact Source issuance route; preserve existing active rights/UNKNOWN. Obtain independent plan/policy checks required by risk before each writer issue.
- [ ] Expand Vex usages/imports/schema/resource consumers to the full affected closure. The formation query showed 293 AgentRuntimeConfig usages with a 50-result display limit; that output is NOT an exhaustive map. Freeze actual paths, roles and package/Cedar resources before editing.
- [ ] Bind each retained callable to its reviewed successor/removal and unchanged ceiling; new callables use the existing new-function rule. Record every unpaired/over-cap role honestly. No inferred baseline or numeric PASS.
- [ ] Record the declared adoption cohort, config/DB identities and supported old-bundle recovery checkpoint; read operational state only through its owner. Unknown/unreadable state blocks dependent activation.

**Done:** exact prewrite packet and independent plan/policy result accepted, actual Source issue exists; otherwise keep implementation NOT_RUN and report the precise gate.

## Task 1 — Typed final contracts and finite compiler obligations

**Files:** prospective new src/config/execution-catalog.ts, execution-routing.ts, src/orchestration/workflow-obligations.ts, test-plan.ts; final project-manifest/component/enablement/routing/TestPlan schemas and focused tests. Register the five schema resources in the existing package.json files inventory and check SDK/native resource closure; preserve every pre-existing package value, including the protected Source version. No SDK index export is included in this cycle. Exact paths/preimages remain subject to Task 0 issuance. workflow-plan.ts, mastra-boundary.ts, runtime-config.ts, workflow-session-reservation-contract.ts and local-work-admission.ts retain their live contracts until Task 9.

**Interfaces:**
- `parseExecutionCatalog(input: unknown): ExecutionCatalog` validates the sole 13-file manifest/origin/meta shape; qualified identities, full bodies/scopes, provenance and separate enabled map. No parallel normal reader.
- `resolveExecutionRoute(input: ValidatedRoutingInput): ResolvedExecutionRoute` in src/config/execution-routing.ts is a pure final-value function for five-tier selection, whole-route and multi-product rules. No ordinary runtime caller delegates to it in Task 1. At Task 9 cutover, the existing owner delegates and the old selector is removed.
- ValidatedRoutingInput binds work_id/attempt, canonical_kind, admitted project_ids, optional requested route_id/level. Final WorkItemSelection/workflowWorkItemSchema/admission adopt those names at Task 9; old caller team/team_id is then rejected. Typed intent/raw risk_flags/labels remain bound Work metadata, not selectors; canonical Host risk still controls obligations.
- `deriveWorkflowObligations(input: { risk: WorkflowLifecycleRisk; effects: readonly EffectClass[]; completion: CompletionProfile }): WorkflowObligations` uses trusted risk/effects; cfg cannot weaken it.
- `validateTestPlan(input: unknown, binding: TestPlanBinding): TestPlan` checks work/attempt/packet_id/task_contract_digest and named scenarios; no pre-code implementation fingerprint.
- Existing `compileDevelopmentWorkflow` remains unchanged in Task 1. At Task 9 cutover it gains selected catalog/level/obligations input and produces the final actor slots and digest. The pure obligation checker does not run a second workflow engine.

- [ ] Add contract cases: all three levels parse; unknown class/contract/field rejects even if disabled; full product paths/metadata survive JSON clone; malformed model/foreign identity refuses.
- [ ] Add compiler RED cases: renamed IDs retain all gates; missing source plan/high-risk security/test/review refuses; self-review refuses; exactly one develop and one writer enforced; two disjoint or overlapping develop nodes both refuse in this slice.
- [ ] Add split/metadata/routing cases: all 12 refs pinned/no aliases; qualified namespace duplicates/shadowing; stable file identity/revision/timestamps vs digest; all five route tiers; product default beats global kind; selected disabled/missing target refuses; whole-route no field merge; unknown kind/product; multi-product route conflict; scope/class checks and immutable resolved route/level/team digest on restart.
- [ ] Test pure final routing values for same product/kind with new-vs-change intent, different labels and raw risk flags: same route/workflow without explicit route, but distinct context bindings and high-risk obligations preserved. Unknown intent and caller team/team_id refuse under the final admission contract; update live selection/admission callers together at Task 9, not here.
- [ ] Add a pure final-value packet/TestPlan binding case: TestPlan binds immutable draft task_contract_digest; final packet value binds TestPlan ref without a digest cycle. Actual packet admission and Source-issue refusal are Task 9 integration checks.
- [ ] Implement pure finite obligation checks and record prospective old-guard correspondence: source-flow IDs→source effect obligation; prewrite IDs→capability/output/domination; developer IDs→authenticated class; producer count/order→unique authoritative output. Existing live guards/ordinary readers stay unchanged until qualified cutover.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-contract.test.ts tests/execution-catalog-compiler.test.ts tests/workflow-plan-contract.test.ts`; require behavior-specific RED then GREEN and retained controls.
- [ ] Verify strict final project-manifest validation, including missing/extra/duplicate component references and identity/provenance mismatches. Check all five schema files are uniquely selected by the existing SDK and standalone inventories, and that the packaged artifact can resolve every schema used by this slice. Run the existing focused SDK compatibility/resource controls; no release/installation claim follows from Source checks.

**Done:** pure final-value contracts/obligation checks pass on disposable values and, if exposed, through a qualified stable pure SDK API. No existing runtime selection/admission/compiler caller or ordinary reader changes. Final-value access is never an ordinary dual-read; live compiler/Host equivalence remains a Task 9 proof obligation.

## Task 2 — Local catalog merge, provenance and enable semantics

**Files:** new src/config/execution-catalog-merge.ts; tests/execution-catalog-merge.test.ts; final project manifest, package component templates and generated repository custom/enablement/routing envelopes.

**Interfaces:** `mergeExecutionCatalog(input: { baseline: CatalogBodies; local: ExecutionCatalog; incoming: CatalogBodies }): CatalogMergeResult` plans managed update/disposition, not user body shadowing. Ready has one final catalog, unchanged exact custom files/existing switches, body digests and updated manifest metadata. Conflicts name origin/kind/id/reason. Fork creates a full disabled custom body/provenance only. Rebind takes exact old/new refs and selected route/rule paths, full-forks every modified ancestor into custom IDs, clones shared route and rewrites only selected rules through the same config owner; no original definition body is patched.

- [ ] RED `disable_survives_package_body_update`: local enabled map is false; incoming package instructions change; target switch stays false, custom bytes stay exact, body/full cfg digest changes and no false disable/body conflict.
- [ ] RED currentness/fork cases: unchanged managed image takes incoming; edited managed bytes/missing baseline/retired referenced ID/incompatible contract conflict; custom full bodies survive byte-exact; derived base change advisory; new incoming entries disabled; fork changes no binding until explicit acceptance.
- [ ] RED source-planner role→package team→route rebind: full custom team/ref, cloned route and selected product/kind rule; package role/team bytes and unselected route consumers unchanged. Add direct workflow/task/profile-ref paths requiring full custom ancestor copies, ID collision/incompatible/missing path refusal and explicit enable closure. Unused disabled fork is not reported as an effective rebind.
- [ ] Implement body hashing excluding file meta/enablement; full config binds every exact file; project.catalog_provenance[origin][kind][id] references sole file meta owner. Missing/duplicate/different-release source binding rejects; timestamp alone never resolves conflict. Package update does not rewrite repository routing without explicit action.
- [ ] Implement disabled dependency diagnostics and explicit custom binding; no silent auto-enable or package security overwrite. Unsafe overrides remain stored but cannot compile under package safety floor.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-merge.test.ts tests/execution-catalog-contract.test.ts`; inspect raw serialized components for one provenance owner.

**Done:** one pure deterministic merge/seed contract and complete negative cases; editing a draft has no active config effect.

## Task 3 — Decouple document layout from physical storage, without DB relocation

**Files:** src/config/project-paths.ts, project-configuration.ts, project-layout.ts; final project/config schemas; affected project-context/initialization callers identified in Task 0; tests/project-paths-contract.test.ts, project-configuration-contract.test.ts, execution-catalog-activation.test.ts.

**Interfaces:** existing codec owns compose/split for project manifest + 12 exact components; no broad include discovery. Final composed config carries explicit validated Host/Mastra/ledger storage bindings. Existing path functions resolve those without WeakMap/default legacy routing or layout→unified-DB inference.

- [ ] RED `split_cfg_preserves_existing_storage_identity`: same DB inode/file identity, canonical physical path, work/journal/history bytes and provider metadata before/after serialization; monolithic→split document target cannot select workspace.v1.sqlite implicitly.
- [ ] Add refusal cases for relative traversal, symlink/foreign root, missing/ambiguous DB binding, unsafe opener state and attempted storage merge. Preserve the existing-storage refusal.
- [ ] Implement pure final codec/storage mapping. Before cutover it is reachable only through the temporary qualified repair owner, not a second normal loader.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/project-paths-contract.test.ts tests/project-configuration-contract.test.ts tests/execution-catalog-activation.test.ts`; retain existing-storage refusal controls.

**Done:** final cfg is serializable independently of physical storage layout; no live DB/schema/file migration has occurred from these pure checks.

## Task 4 — Temporary atomic repair checkpoint and exact config activation

**Files:** temporary bin/execution-catalog-repair.ts; existing bin/reconcile-artifacts.ts, init-configuration.ts, consumer-configuration-operation.ts, consumer-configuration-adoption.ts, init-core.ts; src/config/clean-initialization-admission.ts and project-configuration-rebind.ts; final operation schema; tests/execution-catalog-repair.test.ts, execution-catalog-activation.test.ts.

**Interfaces:** existing configure plan/apply/resume and pending namespace own final ConsumerConfigurationOperation. Temporary repair is a bounded adapter invoked through existing reconcile-artifacts, not another journal. `inspect/apply/resume` use the same immutable operation_id + generation + plan_digest lookup.

- [ ] Bind final operation to exact repository/workspace/physical DB identities, bundle/schema/catalog, before bytes/presence, target bytes/receipt, CAS, consent and native maintenance token. Generation is minted/advanced by the existing Host maintenance owner under exclusive admission; retain that generation for exact replay, never caller override or a new counter store.
- [ ] Add native disposable-Host RED cases for missing token, open connection, nonquiescent writer, foreign DB/root, stale CAS/config/consent and changed target. Refusal preserves bytes/rights/history.
- [ ] Add interrupted-write matrix at every component/receipt boundary; intent precedes effect, pending fence hides partial publication. Same exact operation resumes before/target states; a third state remains UNKNOWN. Lost ack inspects persisted result before any invocation.
- [ ] Before old reader removal require old-owner inspection no_pending on every target. Test configuration_pending, legacy_initialization_pending, unknown_pending, and unresolved bound archive refs as refusals; only the original owner may disposition and retire pending slot, then inspection must be no_pending. Do not unlink an unknown journal.
- [ ] Add exact already-complete archive replay and foreign generation/plan rejection. Apply the same lookup/fence rule to temporary repair and any separately authorized restore: no automatic reset, rollback or downgrade.
- [ ] Qualify checkpoint handoff: old bundle keeps its ONE ordinary reader; only its temporary repair path parses final values. Under held native maintenance it completes exact repair and no_pending with final target receipt; ordinary old commands remain unavailable. Final bundle then verifies this receipt/storage/generation before releasing maintenance. Interrupted install stays fenced and reconciles via installer owner. No partially converted target is exposed as active.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-repair.test.ts tests/execution-catalog-activation.test.ts`; native child evidence uses supported process owner and declared existing bounds, never a timeout expansion.

**Done:** independently reviewed and delivered repair checkpoint works on disposable copies with real Host storage. It is not applied to the repository yet. Any unsupported maintenance/opener/installer handoff remains a causal blocker, not an operator boolean.

## Task 5 — Authenticated actor classes and immutable work/plan bindings

**Files:** src/authorization/cedar-boundary.ts and exact policy/schema resources frozen in Task 0; src/host-state.ts; src/orchestration/local-work-admission.ts, mastra-boundary.ts, persistent-session-handoff.ts, mastra-session-bridge-contract.ts; existing Work/admission schema owner; tests/cedar-validation.test.ts, bun/host-state.test.ts, execution-catalog-compiler.test.ts.

**Interfaces:** trusted Host resolves actor_class from validated current issued assignment. Task effects intersect role.allowed_effects, profile.tool_policy, Cedar, actual lease/paths/current authorization. Work admission owns immutable execution_level/completion_profile; packet/attempt/journal refs and snapshot bind the same frozen effective plan.

- [ ] RED a caller claiming source_writer/delivery_operator without authenticated assignment; profile-only escalation, disabled role, second writer and stale policy all refuse before reservation/effect.
- [ ] RED all five route tiers; explicit override requires actual owner/product permission; chosen route is complete, never field-merged. Explicit Work level or route.default_level resolves its own team map; invalid level/product/kind/disabled target refuses, no fallback. Multi-product mismatch refuses; VIDA requires extended; changing route/level/team on resume refuses.
- [ ] Prepare and test Cedar principal/schema/policies and writer guards together in disposable fixtures; preserve raw flags, canonical Host lifecycle risk, current identity/CAS/lease and independent actor constraints. Switch live enforcement at Task 9.
- [ ] Keep immutable old Work/request/receipt payloads untouched. Supported old owner disposes active attempts before repair; new admission writes final metadata to existing state owner. Historical old records are opaque evidence without continuation rights; no parser fallback grants them current work status. Test historical listing plus denied resume without rewriting stored bytes.
- [ ] Test exact field preservation: bindings_manifest_ref retains its existing digest contract, separate effective_plan_digest is stored in current packet/Host attempt/journal and Mastra snapshot; no plan file/table is created.
- [ ] Bind intent/raw flags/labels and canonical Host risk separately from route digest; mutate each on a late report/restart and require stale-context refusal. Old team cannot override derived team; product identity and admitted product set must agree with current Work owner.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/cedar-validation.test.ts tests/execution-catalog-compiler.test.ts` plus scoped Host cases for these named predicates; require nonempty JUnit selection.

**Done:** final actor-class and binding checks are verified in isolation; existing live issue/effect checks retain their current contract until the Task 9 cutover. Configured settings alone never grant rights. Native enforcement is a Task 9 qualification result, not a Task 5 claim.

## Task 6 — Three executable teams, fixed graph and deterministic restart

**Files:** workflow-plan.ts, session-handoff.ts, persistent-session-handoff.ts, mastra-session-bridge.ts, final-assurance.ts; templates/catalog/package/teams.yaml and workflows.yaml; tests/execution-catalog-compiler.test.ts, configured-workflow.test.ts, session-bridge-contract.test.ts, final-assurance-public.test.ts.

**Interfaces:** existing compiler returns one graph plus stable symbolic actor slots. Teams generic-compact/generic-standard/generic-extended/vida-fixed provide complete task_assignments/assurance_roles and explicit allowed kinds/projects. Actual actor/history binds at issue; missing roster/capability refuses.

- [ ] Add reachable 14-step graph cases for every preset/risk. Assert delivery_plan/current manifest dominates final_assurance, then execute/verify/closeout; missing manifest refuses. For source_only/artifact test an explicit supported N/A target contract, never a silent deployment downgrade.
- [ ] Assert conditional example expansions: low Compact 11, medium Standard 12, high Extended 17 LLM instances when specified final-assurance obligations apply. Root/adapter/reverse actions are not additional actors. Compact/Standard delivery_prepare maps to delivery-agent/delivery.
- [ ] Enforce test designer ≠ executor; independent focused reviewers; final three excluded from writer/focused actors, reverse actions bound back to the same three. No generic legacy sharing exception.
- [ ] Add finite branch and all_success join cases: multiple true single-choice rejects; required missing/skipped/partial blocks; failed gives bounded FailureArtifact correction; unknown fences; max_attempts exhaustion suspends. No nested child scheduler or new loop framework.
- [ ] Exercise intent_is internal new/change branches in one selected graph while all required gates dominate effects. Different risk/labels cannot silently select a different workflow/level or remove checks. Inventory/disposition old intent/risk/label/priority bindings before removal; unrepresented target conflicts block activation rather than collapsing silently.
- [ ] Close/reopen Mastra+Host fixtures: same frozen bundle/graph recompile has same digest; changed catalog/component/slot/actor/generation refuses before issue; lost acknowledgement does not duplicate action. Preserve same human request attribution across parallel Works.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-compiler.test.ts tests/workflow-plan-contract.test.ts tests/session-bridge-contract.test.ts`; run scoped current configured-workflow/final-assurance controls, without weakening bounds or empty selectors.

**Done:** three team compositions and the fixed VIDA graph pass disposable contract checks against one prospective compiler contract. Live engine wiring and native proof occur at Task 9/10; existing ownership semantics remain in force.

## Task 7 — Registered actual delivery and target verification

**Files:** src/runtime-kernel.ts; new src/orchestration/delivery-evidence.ts and schema; final-assurance.ts; existing bin/release-preparation.ts and native release/installer adapters; tests/execution-catalog-delivery.test.ts.

**Interfaces:** prepare executeDelivery and verifyDelivery registration in the existing operations.registry; activate final registration and live dispatch at Task 9. `projectDeliveryEvidence(input: ObservedDeliveryBindings): DeliveryEvidence` reads owner records only. Outcomes verified_delivered/failed_known/no_effect_proven/unknown; no new delivery tracker or state table.

- [ ] RED deployment pre-issue refuses unregistered/unqualified adapter, absent target consent, stale candidate/manifest/generation or missing actor admission. Register vida.native_release only with actual maintained owners; custom adapter requires code/qualification, not YAML shell.
- [ ] Add delivered-but-ack-lost fixture: one actual operation invocation, exact operation+generation+candidate lookup, independent target readback, no reissue. Missing result/readback cannot become no_effect_proven or verified_delivered.
- [ ] Add failure/UNKNOWN/foreign-readback/unauthorized-restore cases; preserve reservation/fence; same-operation inspect/recovery only. Rollback success is not desired deploy success.
- [ ] Wire delivery.execute to trusted operator permission and runtime.read target verification to its admission. Mastra LLM completion does not mark Work COMPLETE; lifecycle closes only the declared completion profile's terminal outcome.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-delivery.test.ts`; retain independent runner results and actual owner/target binding. Test doubles prove only their contract; native adapter qualification remains separate.

**Done:** actual adapter result and independent target evidence are representable/owned; source_only/artifact are visibly distinct from deployment and Runtime acceptance.

## Task 8 — Public config/inspect/help and package closure

**Files:** bin/configure.ts, init.ts, vida-agent.ts, cli-command-contracts.ts, cli-metadata.ts; src/index.ts; package.json; tooling/maintained-source-inventory.ts; tests/configure-cli.test.ts, scope-help-parity.test.ts, sdk-package-compatibility.test.ts, execution-catalog-consumer.test.ts.

**Interfaces:** prepare strict typed list/inspect/fork/rebind/update/enable/route and effective-plan contracts/resources for the existing configure owner; actual live CLI/normal-reader wiring occurs at Task 9. Disposable init qualification creates all 13 documents, valid global generic-standard default route and enabled package closure; only custom components start empty. If setup has no explicit alternative outcome, approved seed completion is source_only; explicit deployment requires its configured qualified target or input_required/refusal, never downgrade. Explicit valid Agent framework setup can seed VIDA/Extended route. Repeat preserves user files; rules remain in one routing.yaml.

- [ ] Add CLI contract cases for listing enabled/disabled/custom entries and dependency path explanations. Plan output shows selected level, graph, full roster/independence slots, adapter readiness and explicit completion target.
- [ ] Add repeat-init and local-disable/custom-value preservation cases; conflicting schema/parallel settings source refuses. Draft edit alone never changes active cfg or an issued request.
- [ ] Fresh init without custom entries must strict-load all 13 files, resolve declared product/kind to generic-standard and compile enabled closure. Empty routing/enablement negative controls refuse; source_only seed is usable without fictitious adapter; explicit deployment missing target refuses/input_required; explicit VIDA route selects Extended.
- [ ] Register all final schemas/templates/raw helpers exactly once through existing inventory; verify SDK import and standalone dynamic-import closure with current package/resource owners. Preserve protected Source/Target version WIP.
- [ ] Run `bun bin/bun.ts test --timeout 5000 tests/execution-catalog-consumer.test.ts tests/scope-help-parity.test.ts tests/sdk-package-compatibility.test.ts tests/configure-cli.test.ts`; require real nonempty cases and complete resource inventory.

**Done:** final CLI/config contracts and resource closure are qualified in disposable fixtures. The user-facing live entry point is wired only at Task 9; no GUI, background provider invocation or second config source.

## Task 9 — Final cutover, caller migration and removal of temporary legacy paths

**Files:** exact caller closure from Task 0; final public config/operation loaders and schemas; remove monolithic/V1|V2 dispatch/templates/schema resources, temporary execution-catalog-repair.ts/CLI route after cohort qualification; package inventory/tests/docs reconcile together.

**Interfaces:** final ordinary runtime accepts only one final config/operation shape. Immutable old payloads/backups are evidence, never executable fallback. Existing native maintenance/installer/config owners coordinate activation; no new store.

- [ ] Before final target activation require Task 4 exact target/receipt/currentness and no_pending/terminal archive disposition at every declared cohort target; old executable attempts and unknown effects block. Installer lost-ack remains with its own supported reconciliation owner.
- [ ] Migrate every actual config/packet/role/profile/operation caller and fixture in the frozen map to final contracts; no false V1 overload, cast-based compatibility shim or guessed mapping. New current records use final discriminator; historical immutable blobs remain byte-identical.
- [ ] In the same qualified cutover wire current selectWorkflow/compile, WorkItemSelection/workflowWorkItemSchema, admission/packet and every affected caller to the final pure routing/obligation contracts; switch CLI/init to the final config reader. Retire the legacy selector and old packet/admission shapes without retaining a compatibility fallback.
- [ ] Remove old parser/schema/dispatch exports and their normal caller branches, fallback/WeakMap layout routing, five legacy workflow selectors, temporary repair code and package resources. Preserve the hash-bound repair checkpoint as recovery evidence outside final runtime. Unneeded temporary tests are retired with their evidence; final tests prove absent old imports/exports and denied old-format activation.
- [ ] Run independent negative AST/import/resource checks for every removed family; assert unknown old consumers refuse, no default fallback and no leftover legacy entry. Retained budgets map removed callables to explicit removal dispositions, not new identities to reset ceilings.
- [ ] Run final statics/normal hooks and applicable existing tests on final bytes once; retain failures/UNKNOWN and resolve causal defects through their owner. Do not turn this task into unrelated whole-repo cleanup.

**Done:** final package has one active format and no temporary repair/legacy execution path; cohort data/history and exact physical storage preserved. Actual migration is separately consent/currentness/CAS gated, never performed by this plan.

## Task 10 — Independent proof, native delivery and full-chain acceptance

**Files:** existing canonical docs/queue/work evidence; release files only under their release-owner scope.

- [ ] Obtain independent correctness/security/requirements review and separate independent tester on final bytes; preserve actual invocation independence and every prior FAIL. Capture coverage/function correspondence/CRAP gaps accurately; manual mutation only if explicitly authorized.
- [ ] Qualify disposable consumers for all three deployment levels and fixed VIDA: research→BA→SA→TestPlan→Source→independent proof→delivery plan→final/reverse→registered effect→target verification→closeout. Include custom/disabled cases and concurrent disjoint Works with a shared-path contention control.
- [ ] Reconcile canonical system behavior, installation/help/decisions and queue to actual implementation, with Source/focused/native/delivery/install/Runtime distinctions. Root prepares exact main integration and normal hooks, preserving unrelated WIP.
- [ ] Release owner verifies complete latest published baseline, selects next PATCH, forms/publishes/installs through current native pipeline and verifies artifact/version/hash/resources. No hardcoded version or journal reset; uncertain release effect stops dependent activation until reconciled.
- [ ] Apply repair/final activation only to an explicitly consented current cohort with exact identity/CAS/quiescence. First fresh delivered disposable consumer, then any separately authorized repository operation. Attributable user testing alone establishes Runtime acceptance.

**Done:** requested behavior is delivered and technically verified; user Runtime acceptance remains pending until the user provides attributable evidence. This plan is not evidence that any checkbox ran.

## Failure and recovery ownership

Root owns exact preimage/head/index captures and each integration boundary. Before commit, restore only the owned task delta after current afterimage/head/index equality; preserve unrelated WIP. If identity/effect is uncertain, stop with UNKNOWN instead of restoring. After public commit/push, use forward correction through normal hooks, never rewrite history. Release/installer/config/Host effects reconcile through their original operations and current CAS; no compensation/reset/downgrade inferred from a failing check.

## Plan self-review and next gate

Coverage: catalog/local/custom/enable (Tasks 1/2/8); complete chain/three teams/fixed (1/6/7/10); actor/Cedar/parallel state (5/6); one-state repair/removal (3/4/9); package provenance/currentness (2/4/8); actual delivery/lost-ack (7/10). Five review-focus classes have named tests in their owner tasks. No gate is replaced by a model verdict.

This plan is a dependency-ordered single feature, not independent subsystem projects. Root implements through the existing governed Source route after the independent plan check; role research/review/test lanes stay bounded. No user choice of harness or routine plan command is needed. Initial state: every implementation checkbox NOT_RUN; Source issuance, release and Runtime acceptance absent.
