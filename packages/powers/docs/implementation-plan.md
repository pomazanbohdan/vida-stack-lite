---
type: Implementation Plan
title: Vida Powers — implementation plan
description: The order of stages, gates and acceptance criteria for the implementation of Vida Powers — from product registration and canonical documents to corpus conversion, the Router, materialization, Runtime integration and Standalone mode.
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- implementation-plan
- product-roadmap
- agent-orchestration
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: donors-manifest
  resource: ../donors.yaml
  title: Manifest of donor sources
- id: agent-system-specification
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification
- id: agent-testing
  resource: /../../agent/TESTING.md
  title: Agent verification gates
- id: okf
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:01:10Z' }
verified:
- { by: deepseek/deepseek-flash, at: '2026-10-19T13:36:34Z' }
- { by: opencode/glm-5.3-flash-free, at: '2026-10-19T13:59:31Z' }
revision: '4'
---

# Vida Powers — implementation plan

Owner: the Vida Powers product owner. Class: **derived execution roadmap** —
the order of work and gates, not a normative specification and not permission for mutations.

Sources of truth: research `docs/research/vida-powers-product-research.md` (B-level) →
the product's S-level documents (`business-requirements.md`, `system-specification.md`
and `acceptance.md`) → implementation and evidence (C-level).

**Goal:** turn the finalized VP concept into an implemented, qualified
product with a canonical instruction corpus, a single entry point, materialization of
results and work in two modes (Standalone / Runtime).

**Architecture:** VP is a portable plugin with its own instruction catalog
(`VPCatalog/v1`) and a single Router entry; the catalog does not duplicate runtime mechanisms but
is designed into the existing activation path (`InstructionRegistry/v1` → research decisions
and workflow stages). In Runtime execution belongs to VIDA Core/Mastra, in Standalone —
to the host's main LLM agent.

**Stack:** Bun 1.4.3 (the single tool chain), TypeScript, JSON Schema
(`Type/vN`), Markdown+frontmatter, SQLite/HostState only in Runtime mode.

**Specification:** `docs/research/vida-powers-product-research.md` (source B) →
the S-documents that Stage 1 creates.

**Rev 2** was rewritten after independent validation (verdict **REJECTED**, 6 blocker /
12 major / 4 minor). State as of 2026-10-19, branch `powers`.

**Rev 2.1** — fixes from validation round 2 (verdict
**ACCEPTED-WITH-CHANGES**): one major (M-01 — the place of the methodology profile
schema, decision D8 added), six minor, the remainder of a DAG contradiction (R-12) and
four research coverage gaps. See §1a.

**Currency.** Last significant change: 2026-10-22: all eight donors are processed (2790 carrier files → 2510 instructions), the package `NOTICE` is present, and decisions D10–D13 are recorded. `stale_after` = 2026-11-19 —
after this date the plan is considered stale and needs review. The independent
verification of round 2 concerned rev 2; rev 2.1 applied its remarks, so
independent verification of rev 2.1 remains a **GAP**. Runtime acceptance is not
established.

---

## Global Constraints

- VP has no own workflow engine, scheduler, ledger, CAS or state store. Runtime
  remains the single owner of transactional state, reservation and lease.
- One canonical owner per contract. `InstructionRegistry/v1`, `HostState`,
  `WorkState/v1`, `ResearchResult/v1`, `DecisionRecord/v1`, `AcceptanceManifest/v1`,
  `WorkItem/v1`, `ImplementationScope/v1`, `ResearchSynthesis/v1`,
  `LifecycleArtifactReference/v1`, `WorkArtifactReference` — are reused,
  not duplicated. The extended instruction registry of the agent package (D3) is a separate
  registry **for VP** with reuse of the existing activation path; a second activation is not
  created, `research_decision.registry` is not changed.
- `packages/agent` — the owner of the runtime owner. VP does not edit them without a separately
  agreed work item with the runtime owner.
- The root `AGENTS.md` is generated from `packages/agent/templates/AGENTS.template.md`;
  the template forbids project-specific content and is replaced wholesale. The VP integration
  writes into the project-owned surface of the consumer, not into the agent package.
- `.vida/*` — the **target** consumer layout, not the current one. The current configuration is
  `agent-runtime.config.v1.yaml` (the `workflows:` section) and the current v1 contracts.
- The tool chain is Bun only. `node`/`npm`/`npx` are not connected to the development
  commands. The full path to Bun on the current machine:
  `C:\Users\pomaz\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe`
  (not on PATH — invoke through the full path).
- One writer per file. Root owns Git, the shared root files (sidecar, config,
  `docs/products.map.md`, the documentation policy, the root `package.json`) and the final
  checks. Workers do not perform Git operations.
- **The plugin has no own infrastructure.** The project runtime is Bun; VP does not introduce
  its own runtime, bundler, package manager, CLI framework or test
  runner. The VP code is runtime-agnostic (only the standard `node:` modules, without
  external dependencies), machine formats are JSON, YAML — for human manifests.
  **Scripts shipped in the skills** (setup, instruction search) —
  plain TS without a build: they run under Bun, Node or Deno.
- The product documentation is formatted per Open Knowledge Format v0.2: the bundle is
  `packages/powers/docs`; the root `index.md` declares `okf_version`; the log
  `log.md` keeps the history; every concept has frontmatter with `type`, `sources`,
  `generated`, `verified`, `status`, `stale_after`. Verification —
  `bun packages/powers/scripts/check-okf.ts` (exit 0).
- Evidence: `BR → SR → AC → evidence`. `passed` is impossible without an actual run.
  Static analysis or the presence of code does not close an AC.
- A changed input invalidates only the evidence bound to it.

## Review Focus

1. **Re-running `vp-setup`** — not a single duplicate of a managed
   block, hook rule or record must appear; a repeated run on an unchanged input gives
   an empty diff.
2. **An instruction selected not by tag** — if an instruction is mandatory (required) or
   is a dependency, it enters the bundle even with low relevance; tag search
   cannot discard it.
3. **A methodology inheritance conflict** — two contradictory inherited options without
   a local decision must stop the selection and ask the owner, rather than
   applying "last loaded wins".
4. **A late result of a subtask** — does not rewrite an already accepted result of
   the parent; it has a separate record and explicit handling.
5. **Outside the Work Scope** — a finding that blocks an AC but is outside the issued
   authority is recorded as a blocker with a request for permission; the scope is not expanded
   automatically, and a defect in someone else's code does not drag in someone else's work.

---

## 1. What changed in rev 2

| ID | Validation remark | Fix in rev 2 |
|---|---|---|
| R-01 | `InstructionRegistry/v1` has `maxItems: 64` and is built into `research_decision.registry`; the corpus does not fit there | Stage 2 separates the **catalog** (`VPCatalog/v1`, the corpus source) and **activation** (a separate extended registry of the agent package, the same engine). D3 was reformulated |
| R-02 | `vp-setup` has no right to edit `packages/agent/templates/AGENTS.template.md` | Stage 5 writes into the project-owned surface of the consumer; a template change is a separate runtime request. D-04 was fixed |
| R-03 | `.vida/*` is a target, not the current layout | Global Constraints + D-06; Stages 4/7 target the current v1 config. Decision D7 added |
| R-04 | Stage 1 fixes S-contracts before D3/D4/D5 | D3/D4/D5 were moved to Stage 0; Stage 1 was split into stable invariants and deferred sections |
| R-05 | The "the plan does not change the runtime" section contradicted Stages 2/5/7 | Every stage has a **Runtime requests** block with an owner; §8 was rewritten |
| R-06 | Distribution is outside scope, but Stage 8 requires `install+run` | Stage 5 receives the deliverable "package + local installation"; D4 blocks Stage 8; the marketplace remains Stage 9 |
| R-07 | The storage GAP excessively blocks the Runtime mode | Stage 7 was split into 7a (current v1 contracts) and 7b (workspace database after the GAP) |
| R-08 | `findings` are not only in `ResearchResult/v1` | D-08 was rewritten: `ResearchResult/v1`, `ResearchSynthesis/v1`, `final-assurance-review/state` are listed; what is missing is precisely the defect registry |
| R-09 | `ArtifactReference` already exists | D-07: `LifecycleArtifactReference/v1`, `WorkArtifactReference` are reused; `ResearchSynthesis/v1`, `ImplementationScope/v1` were added to the reuse |
| R-10 | Stage 3 is unbounded (6375 files) | Stage 3 received an MVP corpus, per-donor exit criteria, a coverage metric, an exclusion list, a tested converter, a license/NOTICE manifest, shards with a single integrator |
| R-11 | The AC invented "≥2 capability tags per instruction" | The AC was rewritten to the research rule: every tag is kebab-case and has ≥2 meaningful components; completeness — where semantically applicable, exceptions documented |
| R-12 | The DAG contradicted the dependencies | The DAG was redrawn, S/M/L estimates and external dependencies added |
| R-13 | The ACs were unachievable | Every stage has verifiable ACs with a command, an artifact and an observation; negative ACs were replaced by positive invariants + a concrete check; the requirement of exact coverage/CRAP for new VP code was added |
| R-14 | Stage 7 ignores the three Lifecycle Scopes | Stage 7 received a separate AC block on `parent`/`workflow`/`independent`, start ≠ completion, a cancellation request ≠ a stop |
| R-15 | Requirements of research §4.5, §4.6, §4.8, §4.9, §5 were omitted | Added in Stage 2 (snapshot within a task, risk-adaptive updates, OKF fields), Stage 4 (Light/Medium/Full, role composition), Stage 5 (`workflow.options`, `decision.evaluate`, threshold calibration) |
| R-16 | Product registration is incomplete | Stage 0 was extended: the doc policy `canonical_roots`/`map_paths`/changelog, the full set of project fields, the root `package.json` workspace, the product KEY + allocator |
| R-17 | Stages without roles and without work items | Every stage has a Role and a Work item; shared files — Root; mutation only with a work item |
| R-18 | D1(b) contradicts "exactly two products" | D1 was rewritten: (b) only as an owner-approved amendment sidecar + system-spec; variant (c) added — a separate repository/package; for (a) the Codex-only risk is recorded |
| R-19 | The host hook surface exists | D-05 was rewritten: there is no runtime hook API, but Codex native `/hooks` + a trusted `SessionStart` hook exist; Stage 5 reuses and qualifies them, hook trust is an explicit GAP |
| R-20 | The `file_count` of pstack counted the whole monorepo | `donors.yaml` was clarified: `file_count` (repository) + `content_file_count` (169 for `pstack/`); OKF is marked as a moving branch snapshot |
| R-21 | "7 donors" vs "8 records" | Reconciled: 7 methodology donors + 1 format reference (OKF); OKF is a format/provenance input, not a methodology |
| R-22 | The number of commits was not reproducible | Instead of a number — the exact commit and the command `git rev-list --count` |
| R-23 | D-01 has an incomplete list of fields; D-03 — the wrong path and scope | Both rows were fixed: the full list of mandatory registry fields; `src/orchestration/configured-context.ts`, support — only workflow-stage `context_skill_refs` |
| R-24 | Parallel donor lanes without an integrator | Stage 3: per-donor shards + one integrator (Root) + the digest rule |

---

## 1a. What changed in rev 2.1 (validation round 2)

Round 2 (`opencode/glm-5.3-flash-free`) gave the verdict **ACCEPTED-WITH-CHANGES**:
all 24 findings of round 1 were fixed by an actual change of the plan, verified against the Source;
one major, six minor and partial research coverage remained.

| ID | Remark of round 2 | Fix in rev 2.1 |
|---|---|---|
| M-01 (major) | Stage 4: the methodology configuration surface in the current v1 config requires extending `agent-runtime-config.v1.schema.json` and the `runtime-config.ts` validator — this is a runtime-owned change without a runtime request; D7 decides the consumer layout, not the place of the schema | Decision **D8** added (where the profile schema lives; the recommendation — VP-owned `Type/vN`, variant (a) only under a runtime work item) + a Runtime request block in Stage 4; D7 was separated from D8 |
| m-02 (minor) | D-07 attributed `AcceptanceManifest/v1`, `ImplementationScope/v1`, `WorkState/v1` to the `artifact_contracts` of the config — there are only `WorkItem/v1`, `ResearchResult/v1`, `ResearchSynthesis/v1`, `DecisionRecord/v1` | D-07 was rewritten with the exact list of both groups |
| m-03 (minor) | D-07 called the field `fingerprint` | Fixed to `implementation_fingerprint` |
| m-04 (minor) | The corrections table referred to "§9", while the "Plan boundaries" section is §8 | The reference was fixed |
| m-05 (minor) | The projection into the registry must be materialized in `agent-runtime.config.v1.yaml#research_decision.registry.instructions.N` (the rigid `source_path` template), i.e. in a Root-owned root file; Stage 2 did not mention coordination with Root | Stage 2: the registry boundary, coordination with Root and the ban on parallel writing to the root config were added + an AC on `test:config:pinned` |
| m-06 (minor) | The wording of the note in `donors.yaml` about the pstack license was confusing | `donors.yaml`: the note was reformulated (a separate `pstack/LICENSE`, MIT) |
| m-07 (minor) | Typos | Fixed |
| R-12 (remainder) | The ASCII DAG showed Stage 5 → 6, while the table showed Stage 6 depending on 1, 2, 3; Stage 7a was not shown | The DAG was redrawn according to the dependency table |
| Research coverage | Partially uncovered: §12 (limits of autonomy), §7.3 (Work Item lifecycle), §9.3 (derived index), §5 (a UI agent ≠ human acceptance) | ACs added in Stage 1 (§7.3), Stage 6 (§9.3, UI≠human acceptance), Stage 8 (§12, compaction) |

---

## 2. Reconciliation of the concept with the current Source (rev 2)

| ID | Research statement | Actual state | Action |
|---|---|---|---|
| D-01 | A catalog of atomic instructions with two dimensions of tags (§4.2) | `InstructionRegistry/v1`: `instruction_id`, `owner`, `revision`, `source_path`, `source_sha256`, `summary_sha256`, `activation_class` (`always_on`\|`lane_entry`\|`triggered_domain`\|`closure_reflection`), `triggers`, `phases`, `lanes`, `output_schema`, `max_bytes`, `privacy`, `status`, `content`; `instructions` — `maxItems: 64`; built into `research_decision.registry` of the config; activation through `src/research-decision.ts` | Stage 2: `VPCatalog/v1` + own scripts; the extended registry of the agent package is a runtime work item (D3) |
| D-02 | 7 donors (§4.1) | 7 methodology donors + 1 format reference (OKF) in `donors.yaml`; copies in `.tmp/donors`, snapshots pinned | Stage 3 |
| D-03 | One entry: `vp-mode` (orchestration) + `vp-setup` (setup) | Skill refs are supported **only** as workflow-stage `context_skill_refs` (`.codex/skills/<name>/SKILL.md`): `src/orchestration/configured-context.ts:63`, `src/config/runtime-config.ts:1330-1333`. There is no general skill discovery. Per-host plugin manifests are absent in the repo; an example — at the donors (superpowers, cursor/plugins) | Stage 5 |
| D-04 | `vp-setup` manages `AGENTS.md` (§3) | `AGENTS.template.md` forbids project-specific content and is replaced wholesale; the consumer does not edit the installed package | Stage 5: write into the project-owned surface |
| D-05 | Session/compaction hooks (§3) | There is no runtime hook API in `packages/agent/src`. The host surface exists: Codex native `/hooks` review, a trusted `SessionStart` hook, qualification through `tooling/agent/cloud-pstack-setup.ts`; a new/changed hash requires a native review — a trust GAP, not synthesized | Stage 5: reuse + qualification, the trust GAP is explicit |
| D-06 | Methodology as product policy (§4.3, §4.4) | The current configuration is `agent-runtime.config.v1.yaml` (`workflows:`); `.vida/project.yaml` is the target. There are no methodology profiles | Stage 4 + D7/D8 (VP-owned schema, carrier by environment) |
| D-07 | Materialization §6 | `LifecycleArtifactReference/v1` (kind, artifact_schema, record_id, path, sha256, source_revision, scope_id, ac_ids, generation, `implementation_fingerprint`, delivery_cycle_id, principal, decision, disposition) and `WorkArtifactReference` already exist. In the `artifact_contracts` of the current config: `WorkItem/v1`, `ResearchResult/v1`, `ResearchSynthesis/v1`, `DecisionRecord/v1`. `AcceptanceManifest/v1`, `ImplementationScope/v1`, `WorkState/v1` exist as schemas and codified contracts in the code, but **not** as `artifact_contracts` records | Stage 6: reuse the existing contracts, add only the gaps |
| D-08 | Findings: the defect registry (§8.3, §8.4) | `findings` — a field of `ResearchResult/v1`, `ResearchSynthesis/v1`, `final-assurance-review/state`; there is no separate defect registry with a lifecycle and dedup | Stage 6 |
| D-09 | Runtime: HostState/CAS/lease (§8.1, §10) | Implemented; a separate storage-admission database remains a GAP against the target `workspace.v1.sqlite`; the current v1 contracts are valid | Stage 7a / 7b |
| D-10 | The Decision Provider "Jeff/Jev" (§4.8) | Absent in the code; the mentions in the research were updated (D5) | D5: provider-neutral `decision.evaluate` |
| D-11 | Wiki/work layout, ID, relations (§9) | The config has `wiki_root`, `wiki_output_root`, `task_prefix`; there are no product Wiki pages | Stage 6 |
| D-12 | Standalone + marketplace (§1, §3) | Public agent delivery — a native executable; npm = the SDK only; there is no marketplace | Stage 5 (D4: three channels) |
| D-13 | Product placement | `packages/plugin` = "Vida Codex" — the Codex layer between the Codex host and the agent (`README.md:14`; `openai-execution-backends.md:34-36`); `packages/powers` — the third product, not yet registered; the config contains only `agent` and `plugin` | D1 resolved: `packages/powers`; registration — Stage 0 |
| D-14 | `changelog_ref` in the research | The file does not exist | Stage 0 (D6) |
| D-15 | Currency of the research | The snapshot `bb4345e` is an ancestor of HEAD; the distance is measured by the command `git rev-list --count bb4345e..HEAD` (the state changes daily) | Research update per §7.1 after Stage 1 |

---

## 3. Decisions (owner)

| ID | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| D1 | Product placement | (a) VP = `packages/plugin`; (b) `packages/powers` as the third product; (c) a separate repository/package | **RESOLVED 2026-10-19**: (b) — VP lives in `packages/powers` as the third product; `packages/plugin` remains the Codex layer. Decision: `docs/decisions/D1-product-placement.md` | resolved |
| D2 | Owner and registration | a separate role "Vida Powers owner"; product registration | **RESOLVED 2026-10-19**: a monorepo of products — each plugin has its own owner, documentation, task set and work space; VP Work Items — in the product, coordination — in `.agent/`. Decision: `docs/decisions/D2-ownership-and-work-space.md` | resolved |
| D3 | Instruction and catalog format | (a) extend `InstructionRegistry/v1`; (b) `VPCatalog/v1` + projection; (c) a separate VP activation; (d) two modes | **RESOLVED 2026-10-19**: (d) — VP is standalone: its own `VPCatalog/v1` catalog and its own `catalog.*` scripts, a plugin with a launch skill and a hook; in the mode of building into the agent package the package must have its own extended instruction registry (runtime work item). `research_decision.registry` is not changed. Decision: `docs/decisions/D3-instruction-catalog-and-registry.md` | resolved |
| D4 | Delivery channel | Codex plugin marketplace / own package / both | **RESOLVED 2026-10-19**: three channels in scope — a separate VP plugin, a build into the agent package, a public marketplace channel. Skill surface: `vp-mode` (the main orchestration skill) and `vp-setup` (auxiliary). Decision: `docs/decisions/D4-delivery-channels.md` | resolved |
| D4b | Marketplace owner and hosts | a marketplace at the repo root / `packages/powers` itself / a separate repository; the set of hosts | **RESOLVED 2026-10-19**: `packages/powers` is itself the marketplace (`source: "./"`, publication as a Git repository through the existing Source mirror pattern); Codex — the verified first host, the rest — declared support with a limitation. Decision: `docs/decisions/D4b-marketplace-and-hosts.md` | resolved |
| D5 | Decision Provider and routing | a specific provider / a provider-neutral interface | **RESOLVED 2026-10-19**: a provider-neutral `decision.evaluate` contract (implementations: the agent's master LLM / an external provider per host config), Agent Fallback mandatory; routing = LLM selection + agent formation from a fixed reference + flow level (Light/Medium/Full); the owner of the execution graph is untouched. Decision: `docs/decisions/D5-decision-provider.md` | resolved |
| D6 | Research change log | create `*.changelog.md` / remove the reference | Resolved by format: the bundle log `packages/powers/docs/log.md` (OKF §9), which `vida.changelog_ref` points to; a separate `*.changelog.md` is not needed | 0 |
| D7 | Environment-driven VP initialization | one layout for everything / three carriers | **RESOLVED 2026-10-19**: `vp-setup` determines the environment — Standalone → a managed YAML block in `AGENTS.md`/`CLAUDE.md`; agent-delivery → the config file of the agent runtime; host shim → the project config file from templates. Decision: `docs/decisions/D7-consumer-initialization.md` | resolved |
| D8 | Methodology profile: schema and carrier | (a) a section in the runtime config; (b) a VP-owned file; (c) one schema, carrier by environment; (d) only `.vida/project.yaml` | **RESOLVED 2026-10-19**: (c) — the `VPMethodologyProfile/v1` schema belongs to VP; Runtime — a section in `.vida/project.yaml`, Standalone — a managed YAML block of the instruction file, host shim — the project config file. Decision: `docs/decisions/D8-methodology-profile.md` | resolved |

---
## 4. Stages

Stage rules: one Role, a list of files, interfaces, ACs with a command and
an artifact, evidence, dependencies, estimate. Every stage is additionally obliged
to prepare **its own task-level plan** (bite-sized steps, exact files, exact
tests) per `writing-plans` before execution; this document defines the order and
the gates, the task plan defines the steps.

The common part of the ACs: the artifact exists at the specified path; the command completes with
code 0; the evidence is recorded in the work item. For VP code: exact coverage 100% and CRAP within
the baseline, by analogy with `packages/agent` (`test:coverage` +
`coverage:gate` + `crap`), confirmed in the stage's task plan.

### Stage 0 — Decisions, registration, hygiene
**Role:** product owner + Root (shared files). **Estimate:** S. **Work item:** VP-0.

Work:
- Decision records (a separate artifact, research §7.2) for D1–D9, D4b and D10–D13;
  stored in `packages/powers/docs/decisions/` as OKF concepts of type `Decision`.
  D1 — **recorded** (`docs/decisions/D1-product-placement.md`). D3, D4 and D8 — before
  Stage 1, because Stage 1 fixes the S-contracts, and Stage 4 needs the defined place of the
  profile schema.
- Product registration (the list from the D1 decision, owner — the repository owner):
  1) `AGENT.sidecar.md` — "exactly two products", "two product roots",
     "Repository projects are …" + a row in the ownership map; 2)
     `packages/agent/docs/system-specification.md` — "approved target keeps product
     Source in packages/agent and packages/plugin" and a row of projects; 3)
     `agent-runtime.config.v1.yaml` — `projects` with the 11 mandatory schema fields,
     `repository.code_selectors`, `delivery_group`; 4) `packages/agent/knip.config.ts` —
     the workspace block `packages/powers`; 5)
     `docs/agent-instructions/documentation-policy.v1.json` — `packages/powers/docs` in
     `canonical_roots`; 6) `docs/products.map.md` — a VP row; 7) `README.md` — the
     "Vida Powers" row in the products table; 8) the root `package.json` — `workspaces` +=
     `packages/powers`, plus `packages/powers/package.json` and `.bun-version`.
- `packages/plugin` remains the Codex layer and is not part of the VP registration; its
  canonical documents are filled by the Plugin owner.
- The VP product space per D2: `ledger_root: packages/powers/docs/work` (Work Items and
  evidence — versioned OKF concepts in the product), coordination — in `.agent/`;
  the VP `task_prefix` differs from `TASK` so that there are no identifier collisions.
- The product KEY (for `<KEY>-W<NNNN>` / `<KEY>-<N>`) and the ID allocation rule.
- The research document changelog: the bundle log `packages/powers/docs/log.md`
  (OKF §9) is maintained on every change of the concept; the `vida.changelog_ref` reference
  points exactly there.

AC:
- `bun run --cwd packages/agent test:config:pinned` → exit 0 (the config is valid).
- `bun tooling/agent/check-documentation.ts <all changed .md>` → `failures: []`.
- `bun run --cwd packages/agent test:pinned` → exit 0 (the doc-policy test passes
  after extending `canonical_roots`).
- `bun packages/powers/scripts/check-okf.ts` → exit 0 (the bundle conforms to OKF v0.2).
- Each of D1–D9, D4b and D10–D13 has a Decision record with the owner, date, options and reason.
- `git ls-files packages/powers` shows the registered files; `packages/powers/docs`
  is present in `canonical_roots`.

Evidence: decision records, the output of the three commands, the registration diff.

Dependencies: none.

---

### Stage 1 — Canonical product documents (B → S)
**Role:** product owner. **Estimate:** M. **Work item:** VP-1. **Requires:** Stage 0.

Work:
- `business-requirements.md`: goals, Standalone/Runtime boundaries, limits of
  autonomy, the areas (§2), requirements for materialization and evidence.
- `system-specification.md`: observable behavior — the Router contract, the
  `catalog.*` operations, the instruction and catalog model, the methodology profile, `artifact_contract`,
  Join/Lifecycle Scope, Scope-First, the Findings registry, layout/ID/relations, the modes.
- `acceptance.md`: ACs with stable IDs, bound to SR clauses.
- The traceability matrix research § → SR § → AC id. Normative text without an SR binding
  is either transferred or marked "context, not a norm".
- The research document is updated **in place** (§7.1): it contains only the current
  finalized content, the history — in a separate changelog artifact; fundamentally new
  topics — separate research documents. A source update triggers an assessment of the impact on the
  related decisions, requirements, tasks and checks (§7.6); the currency is recorded
  explicitly rather than inferred from the presence of the file.

Separation into stable and deferred: the invariants that do not depend on D3/D4/D5
(boundaries, Scope-First, materialization, evidence discipline) are fixed now;
the sections about the catalog format, the delivery channel and the decision provider — after Stage 0.

AC:
- Every normative paragraph of the research has an SR clause or a "context" mark.
- Every AC has an ID and a binding to an SR; no AC is closed by "the presence of code".
- The traceability matrix is checked for completeness (rows research § 1–14).
- The research document contains no chronology, notes about previous versions and
  "previously it was …" formulations; the changes are recorded in the changelog artifact with the date,
  the executor and the reason; new topics have separate documents, not copies.
- The Work Item lifecycle (§7.3) is fixed in the S-document with separate ACs:
  a draft is clarified in place; after acceptance the scope is frozen, changes
  require a controlled review; a completed task is not rewritten for
  a new request — a new Work Item is created with a link (`changes`, `extends`,
  `follows-up`, `fixes`) with its own AC and evidence.
- `bun tooling/agent/check-documentation.ts packages/powers/docs/*.md` → `failures: []`.
- The created S-documents enter the bundle per OKF v0.2 (frontmatter, `sources`,
  `generated`, `verified`, `status`, `stale_after`); `bun packages/powers/scripts/check-okf.ts`
  → exit 0.

Evidence: three documents, the matrix, the doc check, an independent review of the document.

Dependencies: Stage 0 (in particular D3/D4/D5).

---

### Stage 2 — Instruction format, catalog, own `catalog.*` scripts
**Role:** product owner + implementer. **Estimate:** L. **Work item:** VP-2. **Requires:** Stage 1 (D3).

Work (per D3: VP is standalone — its own catalog and its own scripts):
- `VPCatalog/v1`: the canonical corpus in the product — `.md` instructions with frontmatter in
  `packages/powers/instructions/` (the catalog design), without a limit on the number of records. Instruction fields: `instruction_id`,
  `capability_tags[]`, `pattern_tags[]`, `conditions`, `artifact_contract`,
  `compatibility` (groups/exclusions/dependencies), `provenance` (donor, license,
  source revision), `revision`, `status`, `content`.
- Tag rules: kebab-case; every tag has ≥2 meaningful components; `TDD` — an alias of
  `test-first-development`; a tag ≠ agent/skill/step/permission.
- **VP's own scripts** `catalog.tags` / `catalog.search` / `catalog.get` /
  `catalog.compose`: deterministic, implemented in VP code, work without the Runtime.
  The result contract, the boundaries, the behavior in the absence of data, the obligation of dependencies.
- **The specification of the extended instruction registry of the agent package** (for bundled mode):
  its own schema and its own configuration section, with the extended set of VP fields;
  `research_decision.registry` is not changed.
- A snapshot of the applied instructions within an active task (research §4.5).
- Risk-adaptive updates (research §4.6): change classes → verification/acceptance.
- OKF fields for reference records: `index.md`, `sources`, `stale_after`, history
  (research §4.9).

Runtime request (owner — agent maintainer): add an extended
instruction registry to the agent package (schema + configuration section + reading by the existing resolver);
activation, digests, `privacy`, `max_bytes` and `output_schema` verification — the same
ones that already exist in the runtime; **no second activation engine is created**. VP does not edit
`packages/agent` itself.
Registry boundary: VP records do **not** enter `research_decision.registry.instructions.N`
(the rigid `source_path` template) but go into their own section of the agent package registry.
The registry section lives in the root config (Root-owned), so writing to it is coordination
with Root; parallel writing to the root config is forbidden.

AC:
- The schema validates an instruction; an invalid one — a clear error with the fields.
- `catalog.search` returns only the ID/name/short description; the full text — only
  through `catalog.get`/`compose`.
- `catalog.compose` includes mandatory instructions and dependencies regardless of the
  relevance score; conflicting groups are detected as a compatibility error.
- The catalog has no limit on the number of records; the restriction of the research contour registry
  does not extend to VP.
- The `catalog.*` scripts work **without the VIDA Runtime**: the catalog and the operations produce
  a result in-process without the agent package.
- The specification of the extended agent package registry is accepted by the runtime owner before
  the close of Stage 2; writing to the registry section is validated by the config validator;
  `bun run --cwd packages/agent test:config:pinned` → exit 0.
- The exact set of commands and tests — in the stage's task plan; VP code must have exact coverage 100%
  and CRAP within the baseline.

Evidence: schema tests, unit tests of the operations, a projection test, a coverage report.

Dependencies: Stage 1.
---

### Stage 3 — Conversion of donors into the corpus
**Role:** separate donor lanes + a Root integrator. **Estimate:** L (the largest). **Work item:** VP-3. **Requires:** Stage 2.

Scope boundaries (mandatory before the start):
- **Corpus:** all eight donors — superpowers, ponytail, matt-skills, addy-skills,
  bmad-method, pstack, gsd-core and open-knowledge-format — were processed against the
  same exit criteria: 2790 carrier files → 2510 instructions. The MVP pair is a subset
  of that corpus. The owner's maximum-coverage criterion is recorded in
  `task-plan-step-d.md`; 2510 is its result, not a sufficiency threshold.
- **Exit criteria per donor:** inventory → atomic instructions → tags → dedup →
  conflicts → `artifact_contract` → provenance; a signed coverage report.
- **Exclusion list:** donor execution engines, tracker integrations, state journals,
  monolithic prompts are not transferred (research §4.1).
- **The converter** is a maintained, tested TS tool under Bun, not a one-off
  procedure; it has its own tests.
- **The package `NOTICE`** lists every donor's ID, license, license file and pinned
  revision; it records the Apache-2.0 attribution for Open Knowledge Format.
- **Shards:** every donor writes its own output shard; the integrator — Root; the corpus
  digest is computed after integration, not during parallel work.

AC:
- For every processed donor: an inventory of 100% of the carrier files (tracked) and
  a coverage report.
- Every instruction: `capability_tags` and `pattern_tags` filled where this is
  semantically applicable; exceptions — with a justification in the registry; every tag —
  kebab-case and has ≥2 meaningful components.
- Every instruction has `provenance` (donor + license + revision from `donors.yaml`),
  `revision`, `status`.
- Unresolved conflicts — in the conflict registry, not hidden in the text.
- Every dedup match **is merged** into one instruction: `provenance[]` contains all
  sources, the terminology is reduced to the vocabulary, `revision` is raised; no separate
  "discarded" duplicates remain.
- Instructions that produce a result have an `artifact_contract`.
- The converter has tests; `bun run --cwd packages/powers test:coverage` — exit 0.
- **Gate met (2026-10-22):** `packages/powers/NOTICE` lists all eight donors and records the Open Knowledge Format attribution. Legal review of all donor-license obligations remains open in `docs/traceability.md`.

Evidence: inventories, coverage reports, the corpus digest, converter tests, sampling
of human verification (at least 10% of instructions, no fewer than 30 units — the size
is approved in the stage's task plan).

Dependencies: Stage 2.

---

### Stage 4 — Methodology policy of the product
**Role:** product owner + implementer. **Estimate:** M. **Work item:** VP-4. **Requires:** Stage 2, 3; D8.

Work:
- **The profile schema is VP-owned** (D8): `VPMethodologyProfile/v1` in `packages/powers/config/`,
  with a single owner. **The carrier depends on the environment (D7):** Runtime — a section in
  `.vida/project.yaml`; Standalone — the same section in a managed YAML block of
  the project instruction file; host shim — the project config file. One semantics,
  different carrier files.
- `Effective Methodology Profile`: groups (testing-sequence, review-strategy,
  architecture, delivery), explicit selective inheritance between products, local
  override, a conflict → a question for the owner.
- Task-scoped override: requested once, recorded, passed to child
  agents, does not change the permanent profile, permissions and security gates.
- Live Inheritance: references to stable IDs without version pinning; a change of behavior
  = a new pattern ID.
- Light/Medium/Full and role composition (research §5): depth, obligation
  (`required`/`conditional`/`optional`) and applicability — separate properties.

Runtime request (owner — the runtime owner): **one shared request** for three points —
the extended instruction registry of the agent package (D3), reading the methodology
profile (D8) and a decision on `instruction_root` for VP instructions. In Runtime mode the profile
is read from the **current** config (`agent-runtime.config.v1.yaml`),
while `.vida/project.yaml` is the target layout, unavailable until the cutover; therefore the Runtime part of
Stage 4 is marked as blocked by the cutover, and the Standalone part is fully
executable. VP does not edit `packages/agent` itself.

AC:
- The profile is determined deterministically for (product × task) — a test matrix.
- An inheritance conflict stops the selection and formulates a question; "last loaded
  wins" is not applied.
- The override is documented, passed to child agents and does not leak into neighboring
  products.
- The semantics of an instruction do not change under the same ID; a change → a new pattern ID.
- Light/Medium/Full do not skip mandatory ACs, materialization and mandatory gates.

Evidence: resolution matrix tests, configuration schema tests, an example of a conflict.

Dependencies: Stage 2, 3.

---

### Stage 5 — `vp-mode`, `vp-setup`, the package and delivery channels
**Role:** implementer (+ the runtime owner for host hook qualification). **Estimate:** L. **Work item:** VP-5. **Requires:** Stage 3, 4, D4.

Work:
- **`vp-mode` — the main orchestration skill:** a request in ordinary language → selection of
  instructions → bundle (role, task contract, effective methodology, scope, materialization
  requirements, references to artifacts) → delegation or execution; fallback
  to the main agent.
- **Routing (D5):** LLM selection → agent formation according to a fixed reference
  (the instruction catalog) → flow level (`Full` / `Medium` / `Light`) according to
  the methodology profile. `workflow.options` and `decision.evaluate` (§4.8) —
  provider-neutral operations; the relevance threshold is a calibrated parameter, not
  a universal constant; the owner of the execution graph remains untouched.
- **`vp-setup` — the auxiliary setup skill (D7):** context-dependent initialization
  with three writers: Standalone → a managed YAML block in the project `AGENTS.md`
  (or `CLAUDE.md`, if `AGENTS.md` is absent); agent-delivery → the config file of the
  agent runtime; host shim → the project config file from templates. All three:
  idempotency, preservation of third-party instructions, configuration of the available host
  hooks, layout mapping, activation verification. No writer changes the agent
  package.
- Host hook qualification: reuse the existing native `/hooks` surface; a change of
  the hash requires a native review — the trust GAP is recorded, not bypassed.
- **Channel 1 — a separate plugin:** per-host plugin manifests (`.codex-plugin/plugin.json`,
  `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` etc.) with the fields
  `name`, `version`, `description`, `author`, `license`, `keywords`, `skills`,
  `hooks`; the skills `vp-mode` and `vp-setup` in the skills directory.
- **Channel 2 — a build into the agent package:** VP instructions travel into the native delivery together
  with the extended instruction registry (D3); the canonical copy remains in VP, and
  the package receives a generated artifact with a declared Source link and digest.
- **Channel 3 — marketplace:** `packages/powers` is itself the marketplace owner (D4b):
  a per-host `marketplace.json` (a list of plugins, `source: "./"`) and `plugin.json`;
  publication — through the existing Source catalog mirror pattern; installation through
  `codex plugin marketplace add <git-url>`. Codex — the verified first host; the rest
  of the hosts — declared support with a marked limitation.

AC:
- Re-running `vp-setup` on an unchanged input → an empty diff (test) **for
  each of the three environments** (Standalone, agent-delivery, host shim).
- `vp-setup` does not change a single file of the installed agent package (a test for
  read-only access to the installed paths).
- Activation is verified for: the session start, restoration after compaction, the context of
  a delegated agent; the exact event names — the host adapter.
- Bootstrap does not load the whole corpus into the session.
- The absence of a host capability is marked as a limitation, not as an equivalent
  check.
- Channel 1: the plugin is installed locally and passes a smoke check; the per-host
  manifests are valid (a manifest schema test).
- Channel 2: the build into the agent package is reproducible, contains the Source link and digest;
  `bun run --cwd packages/agent test:resources:pinned` → exit 0.
- Channel 3: the marketplace definition is valid, installation through the Git marketplace
  passes on a real host (Codex — verified); the evidence is an installation record with
  the date, host and version.

Evidence: setup tests (repeated run), a host support matrix distinguishing
`verified` / `declared`, an activation log, packaging/installation records.

Dependencies: Stage 3, 4, D4.

---

### Stage 6 — Materialization, Work Items, Findings
**Role:** implementer + runtime owner (for Runtime registries). **Estimate:** L. **Work item:** VP-6. **Requires:** Stage 1, 2, 3.

Work:
- Materialization: reuse `ResearchResult/v1`, `ResearchSynthesis/v1`,
  `DecisionRecord/v1`, `AcceptanceManifest/v1`, `ImplementationScope/v1`,
  `WorkItem/v1`, `WorkState/v1`, `LifecycleArtifactReference/v1`,
  `WorkArtifactReference`; create only the missing parts (Action/Event Record,
  relations) — with their own owner.
- `artifact_contract` in instructions: the output type, the data and references, the place of
  materialization, the method of verification; the presence/format/digest check is separate from
  the semantic check.
- Work layout: stable IDs, an ID allocator, typed relations (`derived-from`,
  `informs`, `implements`, `tests`, `blocks`, `supersedes`, `changes`,
  `found-during`), shallow storage.
- Search and navigation (§9.3): primary search by ID, filename, title, body, type,
  product, tags/labels and relations; the full-text index is **derived**,
  recoverable, does not duplicate normative documents; someone else's normative documents outside
  `wiki_root` are indexed by reference rather than copied.
- Findings: Standalone — append-only JSONL per product; Runtime — product
  isolation in the existing SQLite/HostState; centralized writing through a single writer;
  hybrid dedup (identity → fingerprint → semantic candidates → equivalence
  check); append-only history.

AC:
- `passed` is impossible without an actual run of the check (a test for a forged PASS).
- A late result of a subtask does not rewrite the accepted result of the parent; it has
  a separate record (test).
- A blocking finding outside the scope is recorded as a blocker + a request for permission; the scope is not
  expanded (test).
- Dedup: a confirmed duplicate is linked to the canonical `finding_id` while preserving the
  new evidence; an ambiguity is not merged; re-delivery does not create a
  repeated event (a table of cases).
- Creating findings is not authorization to fix (test).
- The derived index is recovered from the normative sources and is not their copy; after
  a normative document is moved outside `wiki_root` it is indexed by
  reference (test).
- A UI agent that executed a scenario in the browser is **not** a human acceptance: without
  the required human answer the result remains `awaiting-human-verification`, not
  PASS (a test for the ban on a fictitious PASS).

Evidence: contract tests, Runtime mode integration tests, Standalone tests, a table of
dedup cases.

Dependencies: Stage 1, 2, 3.

---

### Stage 7 — Runtime integration
**Role:** implementer + runtime owner. **Estimate:** L. **Work item:** VP-7. **Requires:** Stage 5, 6.

**7a — on the current v1 contracts.** Configured: VP instructions are substituted into the config
stages; external stages are not added, gates are not bypassed. Dynamic: adaptation within
the approved goal and scope; VP does not compile its own graph. Selective Join:
`blocking`/`non-blocking`; non-blocking does not make a subtask independent. Scope-First:
a violation → a blocker, not a silent expansion.

**7b — the target storage** (after closing the storage-admission GAP on the side of the
runtime owner): migration of findings/work operations into `workspace.v1.sqlite`
without a second database.

**Lifecycle Scope (AC block for 7a):** three areas `parent` / `workflow` /
`independent`; for each — an owner, identity, the place of the result, an observable
state, a completion/cancellation mechanism. Confirmation of a start ≠ confirmation of
completion; a cancellation request ≠ proof of a stop. Standalone explicitly has no durable
execution.

AC:
- VP instructions are applied in both modes (a test with a recorded bundle).
- A second scheduler/ledger/database does not appear in Runtime: the check — an inventory of
  processes/files before and after integration.
- A `non-blocking` subtask does not block the parent stage and does not rewrite its
  result.
- The Runtime mode does not depend on closing the storage GAP (7a); 7b has its own gate.
- Lifecycle Scope: for each of the three areas there is a recorded owner and an
  observable state; a test for "start ≠ completion" and "cancel request ≠ stopped".

Evidence: Runtime integration tests, a configured-flow fixture, evidence of work in
Runtime mode, an inventory showing the absence of a second state.

Dependencies: Stage 5, 6; 7b — an external dependency on the runtime track.

---

### Stage 8 — Standalone mode, portability, installation
**Role:** implementer. **Estimate:** M. **Work item:** VP-8. **Requires:** Stage 5, 6, D4.

Work:
- A shared deterministic catalog library/scripts for Standalone and Runtime (Bun/TS);
  duplicating search rules is forbidden.
- Transparent attribution of the last write without leases/locks; conflicts are resolved
  with the practical means of the host; hidden overwriting is forbidden.
- Portability contract: the limitations of each host (session events, compaction,
  subagents, local records) and a support matrix.
- Verification on real hosts: install + run of a minimal scenario.

AC:
- Install + run without the VIDA Runtime on at least two compatible hosts; `catalog.*` and
  materialization work.
- No claim about support remains unproven: the matrix contains
  observations with the date and host.
- Standalone has no durable execution infrastructure: the check — the absence of
  state files/databases, apart from explicit local records.
- Limits of autonomy (§12): the agent does not expand the scope without permission, does not change
  the product methodology on its own, does not cancel mandatory gates; real failures,
  limitations and unfinished GAPs are recorded, pseudo-documents are not created.
- Recovery after compaction restores pointers and state rather than repeating already
  completed meaningful actions.

Evidence: a host matrix with observation records, a session log, an installation record.

Dependencies: Stage 5, 6, D4.

---

### Stage 9 — outside scope (by a separate decision)
Domain packs (§11), the future UI on top of the VIDA API (§9.3), external synchronization
of issue trackers (§8.3). The marketplace channel **is in scope** (D4, Stage 5).
Each of the items — with its own decision about the scope.

---

## 5. Dependencies and estimates

```text
Stage 0 ──► Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5
   S          M          L          L          M          L
                        │          │          │          │
                        └──► Stage 6 ◄─────────┘          │
                             (1,2,3)  ▲                 │
                                   └───┴── Stage 7a (5,6) ──► Stage 7b
                                        │
                                        └──► Stage 8 (5,6)

Stage 7b — after the storage GAP is closed, outside VP.
```

| Stage | Dependencies | Estimate | External dependencies |
|---|---|---|---|
| 0 | — | S | owner decisions D1–D8 |
| 1 | 0 | M | — |
| 2 | 1 | L | D3; a possible runtime request |
| 3 | 2 | L | — |
| 4 | 2, 3 | M | D8; D7 (consumer layout) |
| 5 | 3, 4 | L | D4; host hook qualification |
| 6 | 1, 2, 3 | L | the runtime owner for Runtime registries |
| 7a | 5, 6 | L | — |
| 7b | 7a | M | storage-admission GAP (runtime track) |
| 8 | 5, 6 | M | D4; real hosts |

Critical path: 0 → 1 → 2 → 3 → 4 → 5 → 7a → 7b (the longest chain; Stage 6
depends on 1, 2, 3, so it does not enter the chain up to 7a). The narrowest point is Stage 2
(the corpus, the methodology and the Router depend on it). The longest work was Stage 3,
which processed all 8 donors (2790 carrier files → 2510 instructions) by donor shards
under one integrator (Root).

---

## 6. Quality gates

Commands from `packages/agent/TESTING.md` (executed from `packages/agent`):

| Check | Command |
|---|---|
| Configuration | `bun bin/bun.ts run test:config:pinned` |
| The regular agent phase | `bun bin/bun.ts run test:pinned` |
| HostState and lifecycle | `bun bin/bun.ts run test:host-state:pinned` |
| Coverage and CRAP | `bun bin/bun.ts run test:coverage:pinned` |
| Stored coverage report | `bun bin/bun.ts run coverage:gate:pinned` |
| Stored CRAP report | `bun bin/bun.ts run crap:pinned` |
| Static quality | `bun bin/bun.ts run quality:static:pinned` |
| Format | `bun bin/bun.ts run format:check:pinned` |
| Local matrix | `bun bin/bun.ts run local:candidate:pinned` |
| Portable subset | `bun bin/bun.ts run verify:portable:pinned` |
| Documentation (repo) | `bun tooling/agent/check-documentation.ts <paths>` |

For the VP product, Stage 2 creates its own harness with parallel scripts
(`bun run --cwd packages/powers test|typecheck|format:check|test:coverage`).
VP has code, including its harness, schemas, catalog model, converter, validator,
audit CLI and skill scripts; its product gates apply alongside the repository gates.
The documentation check covers the documents, and `test:config:pinned` checks the config.

Rules: the mutation gate (`test:mutation:pinned`) is launched only with a separate
manual authorization; the current coverage campaign of the repository is not stopped;
VP lanes do not touch frozen measurements; `local:candidate`/`ci` are not launched
outside the delivery lane.

---

## 7. Risks

| Risk | Consequence | Safeguard |
|---|---|---|
| The VP catalog is perceived as a "second registry" | Two activation paths | A separate extended registry of the agent package with the same activation engine; a mapping test; a runtime request instead of local bifurcation |
| `vp-setup` goes into the agent package | Damage to the template, contamination of consumers | An AC on read-only access to the installed paths; a managed block in the project-owned surface |
| The VP design relies on `.vida`, which does not exist | Stages 4/7 are not executed | The target is the current v1 config; `.vida` — a separate cutover track (D7) |
| The scope expands to neighboring products | An imperceptible substitution of the methodology | Explicit inheritance; a conflict → a question; ACs in Stage 4 |
| The Runtime mode is blocked by the storage GAP | Integration is not proven | 7a does not depend on the GAP; 7b — a separate gate |
| The scope of Stage 3 is not completed | The corpus is not ready | The MVP corpus, per-donor exit criteria, a coverage metric |
| The Decision Provider does not exist | An undefined implementation | A provider-neutral interface + a mandatory fallback (D5) |
| An unregistered product | Work outside the project map | Stage 0 (D1, D2) + full field registration |
| A hook trust GAP on a new host | `vp-setup` is not activated | The trust GAP is recorded, not bypassed; the host matrix shows the limitation |

---

## 8. Plan boundaries

- The plan does not change runtime contracts and schemas itself. Any need for `packages/agent`
  is issued as a separate runtime-owned work item with its own owner.
- The plan does not create a second scheduler, DAG compiler, ledger or state store.
- The plan does not define "Jeff" and does not tie VP to a vendor API.
- The plan does not launch the conversion of the corpus.
- The research document remains the single B-source; the S-contracts appear in
  Stage 1 and keep the research as a source.
- Every stage before execution has its own task-level plan (bite-sized steps, exact
  files, exact tests) — this roadmap defines the order and the gates, not the steps.


