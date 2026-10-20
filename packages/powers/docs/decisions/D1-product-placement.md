---
type: Decision
title: D1 — Placement of the Vida Powers product
description: Vida Powers lives in packages/powers as the third product of the repository; packages/plugin remains the Codex layer between the Codex host and the agent.
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- product-placement
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: sidecar
  resource: /../../AGENT.sidecar.md
  title: VIDA agent and plugin source repository — sidecar
- id: readme
  resource: /../../README.md
  title: VIDA — configurable development runtime with a Codex interface
- id: openai-backends
  resource: /../../agent/docs/research/openai-execution-backends.md
  title: OpenAI execution backends — research
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Decision

Vida Powers lives in `packages/powers` as the **third product** of this
repository. The existing product `packages/plugin` (project id `plugin`, visible
name "Vida Codex") remains a **layer between the Codex host and the agent** and
is not Vida Powers. Renaming the `packages/plugin` root to `packages/codex` is not
performed: `plugin` — a stable internal project id (`README.md`: visible names
differ from the stable internal ids `agent` and `plugin`).

# Context

- Research defines VP as a portable agent plugin: canonical instruction corpus,
  a single Router entry, `vp-setup`, work in Standalone and in Runtime.
- `packages/agent` = "Vida Agent" — the runtime and the only public native delivery.
- `packages/plugin` = "Vida Codex" — the Codex integration; the Plugin owner confirmed that
  the plugin targets Codex while the agent remains generic.
- Hence VP is neither a runtime nor a Codex integration, but a separate product with its own
  instruction layer.

# Options considered

> **Clarification (D9, 2026-10-19).** Option (d) was rejected by the general repository
> rule. Deferred registration (D9) is **temporary** agreed work outside the project
> map, not an application of option (d): current VP work is conducted only
> in `packages/powers`, registration of the product in the shared root files is deferred (D9).

| Option | Essence | Conclusion |
|---|---|---|
| (a) VP = `packages/plugin` | Requalify "Vida Codex" into a methodological plugin | Rejected: it would destroy a named product with its own owner and a confirmed direction; VP would stop being host-portable |
| (b) VP = `packages/powers`, third product | A new Source root in this repository + registration | **Accepted** |
| (c) A separate repository | VP with its own bootstrap, bundle and release cycle | Rejected: a break in the B→S→C trace across separate repositories, two owners on one piece of work; the cost of a duplicated bootstrap |
| (d) Temporarily without registration | Work in `packages/powers` until Stage 0 | Rejected: until Stage 0 the product remains outside the project map — without an owner, without doc-policy, without a work item |

# Rationale

1. VP is the methodological layer: instructions, skills, catalog, Router. `packages/plugin` —
   the transport layer to a specific host (Codex). The layers differ in responsibility, and
   merging them would destroy one of them.
2. `packages/powers` is already the de facto place of the work: research, plan, donor
   manifest, donor snapshots. The decision creates no new relocation.
3. One repository yields one `B → S → C` trace: research → S-documents → code →
   evidence, with a single canonical owner for each document.
4. Runtime integration (Stage 7) remains in one trace with the existing mechanism of
   runtime requests, not in a cross-repo contract.

# Consequences

**Product registration (owner — repository owner, performed at Stage 0):**

1. `AGENT.sidecar.md` — the lines "exactly two products", "two product roots",
   "Repository projects are …" + a line in the ownership map.
2. `packages/agent/docs/system-specification.md` — "approved target keeps product
   Source in packages/agent and packages/plugin" and the projects line.
3. `agent-runtime.config.v1.yaml` — an entry in `projects` with the 11 mandatory schema
   fields, `repository.code_selectors`, `delivery_group`.
4. `packages/agent/knip.config.ts` — a separate workspace block for `packages/powers`.
5. `docs/agent-instructions/documentation-policy.v1.json` — `packages/powers/docs`
   in `canonical_roots`.
6. `docs/products.map.md` — the VP line.
7. `README.md` — the "Vida Powers" line in the products table.
8. Root `package.json` — `workspaces` += `packages/powers`; `packages/powers/package.json`
   and `.bun-version`.

**VP consumers (boundaries recorded):**

- Standalone: compatible AI hosts through the Router skill and `vp-setup`.
- Runtime: agents of the main agent receive an instruction bundle from VP; execution,
  permissions and state remain in VIDA Core/Mastra. VP adds no scheduler of its own,
  ledger or state store.

**Unchanged:** `packages/plugin`/`plugin` remains the Codex layer; its
canonical documents (business-requirements, system-specification, acceptance)
are filled by the Plugin owner — this is not part of VP.

# Impact on other decisions

- D2: the VP owner and registration become a separate item of Stage 0.
- D4: the VP delivery channel does not depend on `packages/plugin`; VP is a standalone plugin.
- D7: the target consumer layout of VP does not change — this decision concerns the consumer project,
  not the product root.
- D8: the place of the methodology profile schema is determined within `packages/powers`.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
Supersedes the earlier plan recommendation (option (c) — a separate repository).
