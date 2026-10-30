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
revision: '14'
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

**Files:** `skills/vp-mode/SKILL.md` and the tooling in `skills/vp-mode/scripts/`
(`catalog.ts`, `catalog-cli.ts`, `frontmatter.ts`, `schema.ts`) are implemented.

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
- **Bundle boundaries** (SR-58, AC-26): at most 20 instructions and 64,000 UTF-8 bytes
  summed over selected `content` only, after profile filtering, active-alternative replacement
  and full transitive dependency closure. `1 KB` = 1,000 bytes; the tag dictionary,
  JSON/envelope, metadata and execution context are excluded. Overflow rejects the whole result
  with `CATALOG_BUNDLE_LIMIT_EXCEEDED`; it never trims or returns a partial bundle.
- Materialization per `artifact_contract` ✓ (invariant 7).

## Task E5 — Delivery channels: per-host manifests and the marketplace

**E5a outputs:** .codex-plugin/, .claude-plugin/, .cursor-plugin/, .agents/plugins/,
and the portable package-root plugin.json; the package-local generator reads
config/plugin-manifest-inputs.json, validates it with config/vppluginmanifest.v1.schema.json,
and produces only selected schema-validated manifest files. E5b's approved Muse and
Antigravity native formation targets are separate; .47 owns their exact file/schema/build contract.

- `packages/powers` remains the marketplace owner (D4b). `catalog.json` remains
  the canonical corpus listing, accessed through CLI/SKILL; no catalog copy or
  vendor-specific catalog field is emitted.
- The portable root `plugin.json` has no `skills` or `catalog` field and relies
  on standard `skills/` discovery. Codex compatibility `plugin.json` uses the
  scaffold shape `skills: "./skills/"`. Claude and Cursor plugin manifests list
  exactly `./skills/vp-mode/` and `./skills/vp-setup/`. The generator checks
  these selected host resources are rooted regular `SKILL.md` files before a
  write or successful check; it never copies skill payload.
- Claude marketplace output includes the package description at top level.
  Selected-target metadata remains optional except where that host format
  requires it; public-release metadata remains a separate D4b gate.

### E5 target status

This is the canonical E5a/E5b status table. Other documents link here.

| Target | Current status | Mapping or output | Basis and remaining gap |
|---|---|---|---|
| Portable root | `format-mapped` | Root `plugin.json`; standard `skills/` discovery; no `skills` or `catalog` field | Fixture/schema proof only; no package outputs or host install in this packet |
| Codex | `host-verified` (historical D4b status) | `.codex-plugin/plugin.json` uses `skills: "./skills/"`; `.agents/plugins/marketplace.json` uses local source `./` | This packet proves source format/fixtures only; no new host qualification |
| Claude | `format-mapped` | `.claude-plugin/plugin.json` lists the two shipped skill paths; marketplace includes package description | Official format mapping + fixture/schema proof; no host qualification |
| Cursor | `format-mapped` | `.cursor-plugin/plugin.json` lists the two current shipped skill paths | Explicit bounded inventory; adding a shipped skill requires updating mapping, schema, tests and goldens; no future discovery claim |
| Muse / root marketplace | Local fixture formed; catalog blocked | Muse package manifest and plugin payload in the `.54` scratch fixture; root marketplace output withheld | `.54` CLI fixture build/check exited 0 over 5,233 scratch outputs; Muse and Antigravity each map 2,615 files with equal paths, bytes and SHA-256. Muse catalog is `MANIFEST_MUSE_CATALOG_NOT_READY`: first-party digest proof is absent. `marketplaceWritten` is false. Production input/output and host acceptance are absent. See [Muse marketplace docs](https://meta-models.github.io/muse-code-sdk/next/guides/plugins/concepts/marketplaces-and-updates/) and [compatibility docs](https://meta-models.github.io/muse-code-sdk/next/guides/plugins/concepts/compatibility/). |
| Antigravity | Local plugin-root fixture formed | Root `plugin.json` and plugin payload in the `.54` scratch fixture; install destination remains separate | `.54` validated the `name` and `description` manifest shape and matched the 2,615-file payload map to Muse by path, bytes and SHA-256. Production input/output, host acceptance and publication are absent. Antigravity requires `plugin.json` at the plugin root; its published schema allows only `name` and `description` with `additionalProperties: false` while the example includes `$schema`, so parser tolerance is unverified. See [Antigravity docs](https://antigravity.google/docs/plugins) and [Agent Plugins schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json). |
| Devin | Docs-declared fallback documented; no Devin-specific output | Manifest precedence is `.devin-plugin/plugin.json` → `.claude-plugin/plugin.json` → root `plugin.json`; current Claude and portable artifacts provide documented fallbacks | [Devin CLI plugin docs](https://docs.devin.ai/cli/extensibility/plugins/overview) define these fallbacks. This is format mapping only; no Devin host installation or acceptance is claimed. |
| Kimi | Import/translation documented; native target deferred | Plugin Builder imports `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, generic root `plugin.json`, and `plugins.json` / `marketplace.json` indexes, then converts to `kimi.plugin.json` | [Kimi Plugin Builder docs](https://www.kimi.ai/help/plugins-and-skills/create) document the import flow; it does not require this package to emit a Kimi-native manifest. No host acceptance is claimed. |

The owner layout choice is resolved: Muse uses a root marketplace with the plugin nested under `plugins/vida-powers/`; Antigravity uses a separate compatible plugin root. D4b remains the business owner. D10 §5's prior universal `source: "."` layout is superseded for these two targets only; its historical record is retained. The earlier .47/.50 plan-review status is historical. `.54` formed local fixtures from the canonical source: 5,233 scratch outputs, with equal 2,615-file Muse and Antigravity path/byte/SHA-256 maps. Fixture build/check exited 0 and recorded zero additional writes or removals; the source inventory was unchanged. The Muse catalog remains blocked as `MANIFEST_MUSE_CATALOG_NOT_READY`: Muse docs require `package_sha256` from the install command but do not specify the exact digest algorithm or a test vector, and the `.54` Source receipt fingerprint is not the Muse digest. `marketplaceWritten` is false. The production check exits 1 with `MANIFEST_INPUT_MISSING`; production input/output are absent. No host installation, publication or Runtime acceptance is claimed. `.60` full-package tests passed 411/411 with one Windows skip and typecheck passed 29 files; coverage exited 1 at 466/467 functions and 3,865/3,874 lines, and Knip exited 1 on one `attrib` external-binary issue. Full Step E gates and a fresh M31 review remain open.

E5a's bounded builder/schema/fixture code is independently READY after the .46 repair.
Luna R4 .49 closed I3: check compares present outputs with the ownership ledger; a present
output without a matching ledger digest returns MANIFEST_OUTPUT_CONFLICT, while an initially
absent output remains MANIFEST_OUTPUT_MISSING. Missing, drifted and stale outputs remain
distinct, with read-only file-byte and direct-directory-membership snapshots. The review
confirmed I1 (Codex skills string) and I2 (rooted regular SKILL.md guards) and found no new
scoped blocker. All 19 current inputs match the .46 post-state. Stable hashes: builder
5190c935cc88bce9d5cdf3a158c2de9d24a940c13aa066dccf9ce03b55a54901; tests
82f10a1b08b8548d4ddd3e465b404e6e8c6b291cb5a68a843ef5d44f70535649; schema
543e4588daa1315b9894b1d5fa729e70c3f91196059b876fcddd2ba57cf705d1. The .46 RED test hash
84fce27743c358285f879399881779bd2298f4d58f71fa23482e889d2fd29eab differs from the final
test hash; named cases and assertion lines match, so RED is scenario-level, not byte-identical
whole-test proof. GREEN: 28 pass / 0 fail / 202 assertions. The 28-file typecheck passed and
was reviewed, not rerun by .49. Full Step E gates remain pending. M31 R3's endpoint was
unavailable and the DeepSeek free quota was exhausted; neither returned an external verdict.
Production inputs/outputs, host installation, public release and Runtime acceptance remain
open. No local .49 raw review packet was present; the READY verdict is attributed to the
owner's handoff.
The rollback fault-injection test uses the Windows read-only attribute and is
explicitly skipped on non-Windows hosts; this Windows run executes that test,
but no cross-platform injected-failure proof is claimed.

## Execution progress

| Task | Status | Evidence |
|---|---|---|
| E1. Source methodology profile | **closed** | `config/vpmethodologyprofile.v1.schema.json`, `config/methodology-profile.json`; validation lives in `tests/check-corpus.test.ts` (no dedicated `tests/methodology-profile.test.ts` was created) |
| E2. Effective profile | **closed** | `config/vpeffectiveprofile.v1.schema.json`; used by `catalog-cli` (no dedicated `tests/effective-profile.test.ts` was created) |
| E3. `vp-setup` | **closed** | `skills/vp-setup/SKILL.md`, `skills/vp-setup/scripts/setup.ts`, `skills/vp-setup/scripts/cli.ts`, `tests/setup.test.ts` |
| E4. `vp-mode` | **implemented; numeric evidence baseline independently READY** | `.38` records Bun/Node setup and compose smoke checks, 54 focused tests, 28-file typecheck, and 2,510 catalog-payload hash matches. The independent `.65` M3.1 review marks `.62` repair CODE+EVIDENCE READY with no code blocker; it is not a package PASS. The `.70` M3.1 review marks `.67` READY as a numeric evidence baseline (0 Critical/Important, 2 Minor receipt-wording findings); `.67` itself remains `NOT_CLOSED` with `packagePass: false`. Tests, typecheck, Knip, corpus/audits, donor validation, OKF and Markdown gates bind to the `.67` bytes. Coverage has no statement counter, so no separate 100% statement-coverage claim is made; branches 0/0 are uninstrumented. Exact counts are in WORK and `.67`. Deno unavailable |
| E5. Per-host manifests and marketplace | **E5a bounded code READY; E5b production qualification open** | `.49` READY, I1/I2/I3 closed; `.54` fixture build/check exited 0 over 5,233 scratch outputs with equal 2,615-file Muse/Antigravity path/byte/SHA maps; Muse catalog is `MANIFEST_MUSE_CATALOG_NOT_READY`. `.67` native fixture count is 2,617 package files plus one fixture-only input; its parity is bound only to `.67` bytes. `.69` focused OKF and Markdown checks pass; final native fixture parity after `.69` docs is pending. The `.65` review is not E5b approval; `.70` validates numeric evidence only. `.67` remains `NOT_CLOSED`; production input and first-party Muse digest proof are unavailable. Production outputs, host installation, publication and public metadata, legal review, and Runtime acceptance remain open |

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
9. Selected host formats use their supported skill field shapes and resolve required rooted `SKILL.md` resources; `catalog.json` remains the sole corpus listing; generated manifests validate against their schema (AC-45).
10. An entry in `docs/log.md` (OKF §9) about each change of the step.
11. Generation changes only ledger-owned, digest-matching files; foreign or modified targets conflict before writes; check preflights the ownership ledger, transaction state and required skills without writes; failed transactions roll back or fence future writes (AC-46).
