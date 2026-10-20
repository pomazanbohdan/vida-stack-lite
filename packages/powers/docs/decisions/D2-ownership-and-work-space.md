---
type: Decision
title: D2 — Ownership and workspace model of VP in the monorepo
description: 'VP is implemented in this repository as a monorepo of products: each plugin has its own owner, its own documentation, its own task set and its own workspace; VP Work Items and evidence live in the product, coordination — in the repository.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- ownership
- work-space
- monorepo
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: sidecar
  resource: /../../AGENT.sidecar.md
  title: VIDA agent and plugin source repository — sidecar
- id: runtime-config
  resource: /../../agent-runtime.config.v1.yaml
  title: AgentRuntimeConfig/v1
- id: documentation-policy
  resource: /../../agent-instructions/documentation-policy.v1.json
  title: DocumentationPolicy/v1
- id: gitignore
  resource: /../../.gitignore
  title: VIDA repository ignore rules
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '3'
---

# Decision

Vida Powers is implemented **in this repository as a monorepo of products**:
each plugin has its own owner, its own documentation, its own task set
(Work Items) and its own workspace. What remains shared is the repository
policy files — `AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, the documentation
policy, `docs/products.map.md`, the root `package.json`, Git.

Specifically for VP:

- **Owner:** a separate role **"Vida Powers owner"** in the ownership map — like "Plugin owner"
  and "Agent maintainer". The role holds the VP canonical documents, accepts D3–D8,
  approves methodological changes, accepts a VP release. Initially this role is performed by
  the repository owner; the role exists separately, so a handover needs no rewriting of
  the ownership map.
- **Workspace:** a **hybrid** — VP Work Items and evidence live **in the product**
  (`packages/powers/docs/work/`) as versioned OKF concepts; coordination,
  the ownership ledger and checkpoints — in the repository (`.agent/`), as in the repo today.
- **Product registration:** VP receives its own `project_id`, `wiki_root`,
  `internal_root`, `ledger_root` (product-level), `code_selectors`, `delivery_group`
  and a separate `task_prefix`, so as not to share the `TASK` prefix with other products.

# Monorepo model

| Product | Root | Owner | Documentation | Work Items | Ledger |
|---|---|---|---|---|---|
| Vida Agent | `packages/agent` | Agent maintainer | `packages/agent/docs` | `packages/agent/docs/work` | `.agent/work` |
| Vida Codex | `packages/plugin` | Plugin owner | `packages/plugin/docs` | `packages/plugin/docs/work` | `.agent/work` |
| Vida Powers | `packages/powers` | Vida Powers owner | `packages/powers/docs` | `packages/powers/docs/work` | `.agent/work` |
| Subsequent plugins | `packages/<name>` | its own role | `packages/<name>/docs` | `packages/<name>/docs/work` | `.agent/work` |

Shared by all products: repository policy files, root tooling, CI, Git.
Separate for each: owner, canonical documents, bundle, Work Items, evidence,
release cycle.

# Context

- The ownership map has an Owner column: "Agent maintainer", "Plugin owner"
  (`AGENT.sidecar.md:33-47`). An owner is a role, not necessarily a person: "Plugin
  canonical documents are filled by the Plugin owner under a fresh scope"
  (`AGENT.sidecar.md:49`).
- Both existing products have `ledger_root: .agent/work` and `task_prefix: TASK`
  (`agent-runtime.config.v1.yaml:77, 89` and the plugin block) — a shared prefix
  for two products in a shared ledger.
- `.agent/` is in `.gitignore` (`.gitignore:5`): new work records are not versioned by
  default, although already tracked files remain in Git.
- Research §6/§7.3 require a Work Item as a **product artifact** with a stable
  ID, AC and evidence: the consumer reads it instead of relying on the agent's memory.
  Therefore a Work Item ≠ the execution state of the repository.

> **Role holder (2026-10-19).** The role "Vida Powers owner" is performed by the repository owner.
> The unit of registration is the **role**, not the person: handing over the role requires no rewriting of
> the ownership map, only a decision of the owner.

> **Role holder (2026-10-19).** The role "Vida Powers owner" is performed by the repository owner.
> The unit of registration is the **role**, not the person: handing over the role requires no rewriting of
> the ownership map, only a decision of the owner.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) A separate role "Vida Powers owner" | A role analogous to "Plugin owner"; canonical documents, D-decisions, release | **Accepted** |
| (b) The repository owner performs the Powers owner role | One person is both the repository owner and the role holder | Accepted as the **role holder**; the unit of registration remains the role (D9) |
| (c) Agent maintainer | VP under the Agent maintainer | Rejected: VP is a methodological product, mixing up owners would destroy the boundary of runtime requests |
| (d) Work Items in `.agent/work` | As in the agent | Rejected: VP work history would not reach Git and would not survive repository cloning; per research, a Work Item is an artifact |
| (e) All history in the product | Besides Work Items, also coordination in the product | Rejected: blurs the boundary between a product artifact and the repository execution state |

# Consequences

1. **VP owner** is added as a line in the ownership map of `AGENT.sidecar.md`; the role is
   distinguished from the Agent maintainer: changes in `packages/agent` are issued as a separate
   runtime request, which the VP owner does not sign.
2. **Product-space registration** in `agent-runtime.config.v1.yaml`: `project_id`,
   `title`, `project_root: packages/powers`, `wiki_root`/`internal_root`:
   `packages/powers/docs`, `ledger_root: packages/powers/docs/work`, `task_prefix`:
   separate from `TASK`, `code_selectors: packages/powers/**`, `delivery_group`.
3. **Doc-policy**: `packages/powers/docs` in `canonical_roots`; changelog events
   of the product — in the bundle log `packages/powers/docs/log.md`.
4. **VP Work Items** — OKF concepts of type `Work Item` in `packages/powers/docs/work/`
   with stable IDs, AC and evidence; navigation — through the bundle index.
5. **Generalization to subsequent plugins:** the registration pattern (owner + docs bundle +
   product work space + separate prefix) becomes repeatable, not one-off for VP.
6. **Product KEY** (for `<KEY>-W<NNNN>` / `<KEY>-<N>`) and the ID allocation rule
   are fixed at Stage 0; the prefix must differ from `TASK` to avoid
   collisions in the shared namespace of identifiers.

# Impact on other decisions

- D3, D4, D5, D7, D8 — accepted by the "Vida Powers owner" on the recommendation of the
  plan author; the technical ones (D3, D5, D8) need no business input.
- D4 (delivery channel) remains a business decision of the owner, because it determines whether VP
  is delivered as a monorepo plugin or separately.
- Stage 0 (registration) is performed according to the pattern described above.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
