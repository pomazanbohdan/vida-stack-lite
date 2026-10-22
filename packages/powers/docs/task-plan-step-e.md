---
type: Task Plan
title: 'Vida Powers — task-level plan for step E: skills vp-mode and vp-setup, setup, manifests'
description: 'Source profile (declaration of groups and alternatives), effective profile with the verification section and the flow level, skills vp-mode and vp-setup with the choice of approval policies and model inventory, per-host manifests and the marketplace.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- task-plan
- skills
- setup
- profile
sources:
- id: design
  resource: /catalog-design.md
  title: Vida Powers — instruction catalog design
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — acceptance criteria
- id: step-d-plan
  resource: /task-plan-step-d.md
  title: Vida Powers — task-level plan for step D
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T19:30:00Z' }
revision: '5'
---

**Goal:** complete the core of the product — the declaration of policies, environment-driven
setup, the orchestration skill and the delivery channels. The shipped scripts
live in `skills/*/scripts/` and remain runtime-agnostic.

**The specification this plan follows from:** `docs/system-specification.md`
(SR-22…SR-29, SR-33, SR-56…SR-62, SR-75), `docs/acceptance.md` (AC-13, AC-14,
AC-25, AC-28, AC-41), `docs/decisions/D4-delivery-channels.md`,
`D4b-marketplace-and-hosts.md`, `D7-consumer-initialization.md`,
`D8-methodology-profile.md`, `docs/catalog-design.md` (§7), `docs/task-plan-step-d.md`.

## Global Constraints

- **Runtime-agnosticism.** The code in `skills/*/scripts/` — only `node:` modules, no
  `Bun.*`, no `import.meta.dir`, no external dependencies; **YAML is not parsed**
  (SR-62). Paths from `import.meta.url`.
- **The format of machine data is JSON.** YAML only for human manifests. Profiles,
  model inventory, vocabulary — JSON.
- **The managed block in a YAML file contains JSON.** Markers + a ```json block — it is
  read by `JSON.parse` without a YAML parser (SR-62), and setup compares its content, not
  the text (SR-56).
- **Idempotency.** A repeated run of `vp-setup` creates no duplicate of the managed
  block, does not duplicate entries, and does not change unchanged fields (AC-25).
- **One owner per artifact.** `catalog.json` — only `convert.ts`; the source
  profile and the vocabulary — owner content; the effective profile — only `vp-setup`;
  the manifests — only the package build.
- **No silent default values** (SR-19, SR-69): if a decision has not been
  made — it remains unresolved and is marked as such.
- **Version — only in metadata**; file names contain no versions, dates or statuses.

## Task E1 — Source methodology profile: who, which groups, which alternatives

**Files:** create `config/vpmethodologyprofile.v1.schema.json`,
`config/methodology-profile.json`; validation lives in `tests/check-corpus.test.ts`
(no dedicated `tests/methodology-profile.test.ts` was created).

- **Why:** setup must ask the user about **approval policies**, and for this
  a declaration is needed: which groups exist, which of them are a user decision,
  which alternatives exist and what each of them means.
- **Format** (`VPMethodologyProfile/v1` — the canonical name of SR-25/D8; the effective
  resolved profile remains `VPEffectiveProfile/v1`, design §7):
  - `groups[]`: `{ id, title, description, user_decision: boolean, default?: string,
    alternatives[]: { id, title, description, instruction_ids[] } }`;
  - `default` — **mandatory** for groups with a product policy (`user_decision:
    false`) and **forbidden** for user-decision groups: this is a recorded policy,
    not a silent default value (D10 §1); a user choice cannot
    change a group with a product policy;
  - the alternative `id` — a **pattern tag** (SR-25: an alternative is a methodology, not
    an instruction identifier); `instruction_ids[]` — the corpus instructions that
    implement this alternative (for validation and search; an empty array = a group
    without instructions);
  - `user_decision: true` — a group where the choice is made by the user; `false` — a group
    determined by the product policy.
- **Owner:** owner content (approved by the owner together with the tag vocabulary).
- **Mandatory composition:** the group `approval-policy` with two alternatives —
  `user_decision: true` (owner mandate). **Binding of alternatives (critical):**
  each alternative has **its own pattern tag**, and exactly that is the `id` of the alternative, while
  the alternative's instruction carries this tag in its `pattern_tags`:
  `proceed-without-waiting-for-confirmation` → `approval-policy-proceed`,
  `size-and-gate-the-work` → `approval-policy-gate`; the shared tag
  `approval-policy` remains a marker of the group (search and overview) but is **not**
  an alternative ✓. Without separate tags compose would not distinguish an inactive
  alternative (both would carry one tag) ✓.
  Groups `testing-sequence`, `review-strategy`, `architecture`, `delivery` —
  `user_decision: false` (SR-25); confirmed groups that have no corresponding set of
  instructions in the corpus — then the group is not declared (it is forbidden to declare something
  the corpus does not have ✓).
- **Validation (validator):** each `instruction_ids` is present in the corpus; each
  alternative has a description; a `user_decision` group has at least two alternatives;
  the alternative `id` — an existing pattern tag in the vocabulary ✓.

## Task E2 — Effective profile: decisions, flow level, verification lanes

**Files:** **update** `config/vpeffectiveprofile.v1.schema.json` (the schema exists from step C
and is already used by `catalog-cli`); no dedicated `tests/effective-profile.test.ts`
was created.

- **Content** (`VPEffectiveProfile/v1`):
  - `groups`: `{ <group id>: { active: <alternative id>, alternatives: [...] } }` —
    **resolved** decisions (the active alternative per group) ✓ (SR-25, SR-26);
  - `flow_level`: the flow level (`full` | `medium` | `light`) ✓ (D8, SR-22);
  - `verification`: the verification section:
    - `available_models[]`: `{ provider, model, family, roles[]: ('main'|'agent'),
      available: boolean }` — the inventory of the environment (owner mandate);
    - `lane_assignment`: `{ lane: string, provider, model, blind: boolean }[]` —
    which model serves which verification lane;
    - `lane_policy`: `independent-provider` | `independent-model` |
      `blind-same-model` — the **chosen** lane;
    - `limitations`: a string with an explicit marker of the environment limitation.
- **Who computes `lane_policy`:** not the user, but a deterministic rule by the ladder
  from the `verify-with-independent-lanes` instruction (another family of another vendor →
  another model of the same vendor → a blind agent on the same model) and
  by the availability of models in the inventory; `lane_assignment` — the assignment of models
  to lanes per the `record-available-executor-models` instruction ✓.
- **The flow level** — per D8 part of the effective profile ✓; determined from the
  source profile (product policy) or by a user decision — distinguished by the
  `user_decision` field ✓.
- **Replacement of an inactive alternative (compose fix).** A profile group is
  a **single choice**: if a dependency (`compatibility_requires`) points to an inactive
  alternative, it is replaced by the **active** alternative of that group (and not by a
  `CATALOG_PROFILE_CONFLICT` error and not by returning the inactive one in the bundle ✓). The rule
  is fixed in design §7 and implemented in `catalog.compose` + a regression test ✓.
  The mutual requirement `compatibility_requires` between two alternatives of one group
  **is removed** from the corpus: the alternatives do not require one another (the cross-reference
  remains in the instruction text) ✓.

## Task E3 — `vp-setup`: environment, inventory, choice, write

**Files:** create `skills/vp-setup/SKILL.md`, `skills/vp-setup/scripts/setup.ts`;
test `tests/setup.test.ts`.

- **Determination of the environment** (D7): Standalone (a managed block in `AGENTS.md` or
  `CLAUDE.md`; if neither exists — it creates `AGENTS.md` with the block ✓), Runtime
  (a section in the runtime config file), host layer (the project config file).
  The determination — by the presence of the carriers; we do not write into third-party files (AC-25).
- **Model inventory:** the input — a **JSON** contract provided by the environment
  (the path is passed by an argument or an environment variable):
  `{ providers: [{ id, models: [{ id, family, roles: ['main'|'agent'], available }] }] }`.
  If there is no inventory — we write an empty list and `limitations` with
  a marker; **we do not invent slugs** ✓.
- **Choice of policies:** for each group with `user_decision: true` setup shows the
  alternatives (title + description) and asks for a choice; the choice is the user's decision
  (owner mandate); if the user has not chosen — the group remains **unresolved**
  and is marked in the profile (without a silent default value ✓).
  **Behavior of an unresolved group:** `vp-mode` does not assemble a bundle for it and
  moves the question into a negotiation request (-negotiation) — none of the alternatives is
  substituted silently ✓; a test for this behavior ✓.
- **Write:** the effective profile is written into the determined carrier:
  - Standalone — the managed block in `AGENTS.md`/`CLAUDE.md`: the markers
    `<!-- vida-powers:profile:begin -->` / `<!-- vida-powers:profile:end -->` and
    inside a fenced ```json block with the profile ✓ (reading through `JSON.parse` ✓,
    without a YAML parser ✓);
  - Runtime/host layer — a JSON profile file in the agreed place of the carrier ✓.
- **Idempotency (AC-25):** a repeated run compares the **parsed** profile
  (not the text) → no changes → no write; only the block that belongs to VP has changed →
  we do not touch third-party blocks ✓ (AC-41: third-party content is preserved ✓).
- **Mandatory duties we do NOT lose:** activation verification (SR-59) —
  a checklist in SKILL.md that verifies the presence of the skills and the profile; the source map
  (SR-75) — records the origin of the instructions and the changes of the setup; protection of
  the installed agent package (SR-57) — setup does not change files of the agent package ✓.
- **Hooks** (D4 Stage 5, SR-60) — **deferred**: this is a dependency on the runtime; the owner
  and the deferral condition are recorded in the decision record (D10).

## Task E4 — `vp-mode`: orchestration

**Files:** create `skills/vp-mode/SKILL.md`; the tooling already exists in
`skills/vp-mode/scripts/` (`catalog.ts`, `catalog-cli.ts`, `frontmatter.ts`,
`schema.ts`).

- A single main entry (D4): accepts a request in ordinary language → `catalog.search` →
  `catalog.compose` → bundle (role, task contract, effective methodology, Work
  Scope, materialization requirements, references to artifacts) → execution or
  delegation ✓ (SR-22, SR-23, AC-13).
- **Respects the effective profile:** the active alternative of a group determines the active
  policy; the bundle does not contain the inactive alternative ✓ (already implemented in
  `catalog.compose` ✓).
- **The flow level** — from the profile; `workflow.options` describes the admissible options, and
  `decision.evaluate` evaluates the submitted candidates; **VP does not compile the execution graph**
  (SR-24, AC-14) ✓.
- **Agent Fallback is mandatory** (SR-18): unavailability, timeout, API error,
  malformed format, unknown candidate ID, insufficient confidence → the main
  agent; materialization: the source of the decision, the selected IDs, the fallback reason ✓ (SR-20).
- **Bundle boundaries** (SR-58, AC-26): the bundle ≤ 20 instructions and ≤ 64 KB of text —
  recorded in the contract of SKILL.md and verified in a test ✓.
- Materialization per `artifact_contract` ✓ (invariant 7).

## Task E5 — Delivery channels: per-host manifests and the marketplace

**Files:** `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`,
`.agents/plugins/`, `marketplace.json`; create the manifest schemas
`config/vppluginmanifest.v1.schema.json` (per-host manifest) and reuse it for
the marketplace listing.

- `packages/powers` — the marketplace owner (D4b): `marketplace.json` with
  `source: "./"` ✓; the per-host manifests list the shipped skills
  (`vp-mode`, `vp-setup`) and the instruction catalog ✓.
- Layout: **per-host** `marketplace.json` and `plugin.json` in their own directory
  (`.claude-plugin/`, `.cursor-plugin/`, `.codex-plugin/`, `.agents/plugins/`) —
  per the D4b pattern; the package description for the marketplace — at the root of the package (`source: "./"`) ✓.
  The package build generates these manifests. E5 supplies the schema and metadata inputs
  and implements the generator under the owner's authorization dated 2026-10-22.
- The generated manifests must validate against the schema and must not duplicate the payload (D4b).
- A new AC: "the per-host manifests and the marketplace description are schema-valid and do not duplicate
  the payload" — a **proposal** (owner approval).

## Execution progress

| Task | Status | Evidence |
|---|---|---|
| E1. Source methodology profile | **closed** | `config/vpmethodologyprofile.v1.schema.json`, `config/methodology-profile.json`; validation lives in `tests/check-corpus.test.ts` (no dedicated `tests/methodology-profile.test.ts` was created) |
| E2. Effective profile | **closed** | `config/vpeffectiveprofile.v1.schema.json`; used by `catalog-cli` (no dedicated `tests/effective-profile.test.ts` was created) |
| E3. `vp-setup` | **closed** | `skills/vp-setup/SKILL.md`, `skills/vp-setup/scripts/setup.ts`, `skills/vp-setup/scripts/cli.ts`, `tests/setup.test.ts` |
| E4. `vp-mode` | **not started** | `skills/vp-mode/SKILL.md` does not exist; the tooling exists (`catalog.ts`, `catalog-cli.ts`, `frontmatter.ts`, `schema.ts`) |
| E5. Per-host manifests and marketplace | **not started** | no `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/`, no `marketplace.json`, no `config/vppluginmanifest.v1.schema.json`; generator scope authorized 2026-10-22, implementation pending |

## Outside this plan

- Step **F**: VP Work Items in `docs/work/`, findings JSONL, `artifact_contract` at
  the work level.
- Step **G**: the runtime request D3+D8 — documents, not code; VP Runtime mode is not
  proven in this scope.
- Setup **hooks** (D4 Stage 5, SR-60) — deferred to the runtime track; the owner and
  the condition — in the decision record **D10** (`docs/decisions/D10-…`), which is created in
  this same step together with the edits of D7/D8 (managed block: JSON in the YAML carrier) ✓.
- **The extended instruction registry of the agent package** (D3) — a runtime request (G).

## Definition of done for step E

1. `bun run --cwd packages/powers test` → 0 failures; `test:coverage` → threshold 1.0.
2. `bun run --cwd packages/powers typecheck` → 0 errors.
3. `bun packages/powers/scripts/check-corpus.ts` → `issues: []`, exit 0.
4. `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0.
5. `bun packages/powers/scripts/check-okf.ts` → `failures: []`.
6. `bun tooling/agent/check-documentation.ts <explicit list of .md>` → `failures: []`.
7. The shipped scripts run under **bun and node** (AC-28) + a static check
   for the absence of Bun-specific APIs (grep over `skills/*/scripts/`). **deno** is not
   installed on this host — a recorded environment limitation (GAP, not a gate);
   when deno appears, the criterion is supplemented ✓.
8. A repeated run of `vp-setup` → an **empty diff** (AC-25); third-party content in
   `AGENTS.md`/`CLAUDE.md` is preserved (AC-41).
9. The per-host manifests and `marketplace.json` are schema-valid.
10. An entry in `docs/log.md` (OKF §9) about each change of the step.
