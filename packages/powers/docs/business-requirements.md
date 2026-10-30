---
type: Business Requirements
title: Vida Powers — business requirements
description: 'Goals, boundaries of responsibility, autonomy constraints and non-functional requirements of the portable Vida Powers agent plugin.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- business-requirements
- product-intent
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: decisions
  resource: /decisions/index.md
  title: Accepted decisions D1–D16 (and D4b)
generated: { by: codex/gpt-6.1-sol, at: '2026-10-26T15:36:09Z' }
revision: '8'
---

# 1. Purpose

Vida Powers (VP) is a portable agent plugin that gives agents in compatible
AI hosts a **canonical way to work**: which methodology to follow, which
acceptance criteria to apply, what to consider evidence, which artifact to leave behind
after the work.

Without VP every agent invents its own process, and the result becomes incomparable and
unverifiable. VP does not replace the agent and does not manage execution — it supplies
rules, instructions and boundaries.

**VP consumers:**

| Consumer | What it receives |
|---|---|
| The agent (in a host or in the VIDA agent) | Selected instructions, the bundle, the methodology profile, materialization requirements |
| The main LLM agent (Master/Router) | A catalog for search and selection, selection rules, the selection procedure when there is no choice |
| A developer in a project | A way to set up VP in their project (`vp-setup`) |
| The product owner | The methodology policy, the decisions made, the execution evidence |

# 2. Goals

- **BR-01.** An agent that works with VP follows an agreed methodology, not
  its own intuition; the choice of methodology is recorded and traceable.
- **BR-02.** VP instructions come from verified sources (donor methodologies),
  have an exact source revision and a license, and contain no foreign execution engines,
  trackers or state logs.
- **BR-03.** The result of the work is a readable and verifiable artifact with
  attached acceptance criteria and evidence, not a retelling in the chat.
- **BR-04.** Evidence is bound to a specific revision of the requirements and the implementation; a change
  of input does not carry over the old evidence.
- **BR-05.** One entry point: the user describes the desired result in ordinary language; they
  do not need to manually launch research, task formulation, TDD, a tester,
  review or verification.
- **BR-06.** Methodology is a product policy, not a situational choice of the agent;
  genuine variability of choice is resolved with the user once and
  recorded.

- **BR-24.** Users can organize and find canonical instructions by their form and topic domain without duplicate instruction files or changes to stable IDs. Existing capability, methodology, role and product selection remains available. A cross-domain instruction can appear in several generated views with one canonical record. Classification uncertainty is explicit. Metadata organization grants no source admission, applicability or execution authority; D14/D15 and existing owner gates remain unchanged.

The agent's instruction-discovery workflow is explicit and economical: derive task intents from the request, established authority, relevant requirements and observed artifacts; discover matching vocabulary; return unique ID-and-description candidates; obtain all selected instructions in one checked text response. A PR reference alone grants no fixing, commit, push or merge authority. Opposite rules remain declared alternatives/conflicts and cannot be hidden as duplicates or chosen by a relevance score. Direction, capability, pattern, form and applicability context stay distinct. Source snapshots are selected explicitly; normal CLI discovery does not require caller-authored JSON. This refinement does not require completing domain classification before basic retrieval can work.

# 3. Boundaries of responsibility

| Zone | Vida Powers | VIDA Runtime |
|---|---|---|
| General methodology and bounded engineering/UX guidance | Owns one canonical instruction corpus | Uses the same instructions through the D3 integration path |
| Selected reference data | Owns typed records in the same catalog; access is by selected resource ID | Runtime resource access requires a separate integration and is not yet implemented |
| Selection of instructions | The catalog + selection semantics | Activation of instructions (systemic) |
| Use of instructions | Forms the bundle for the executor | Activation and registration of the bundle |
| Choice of the next action | Describes the admissible options | Owns the execution route |
| Execution | Does not execute | VIDA Core / Mastra (Runtime), the host (Standalone) |
| State, ledger, CAS, lease | Does not own | HostState, ledger, reservation |
| Materialization | Sets the result contract | Owns the storage and transactions |
| Findings | Sets the register rules | Owns the record in its storage |
| User interface | Not part of VP | A separate future product |

- **BR-07.** VP has no workflow engine, scheduler, ledger, CAS, state store
  or execution history of its own; in Runtime these zones belong to VIDA, in Standalone —
  to the host agent.

# 4. Autonomy constraints

- **BR-08.** No VP instruction expands the Work Scope or grants rights
  that the agent does not have; methodology, a relevance score, the status of an independent agent are
  not a permission.
- **BR-09.** A significant ambiguity with an external or irreversible effect,
  security, scope or product policy requires human authorization.
- **BR-10.** A finding that blocks an AC but requires going beyond the issued authority
  is recorded as a blocker with a permission request; completion without permission is not
  promised. A third-party bug does not turn into an unauthorized scope of work.
- **BR-11.** Creating a defect record is not an authorization of its fix;
  a fix requires a separate decision.
- **BR-12.** A test or a code review is evidence, but not identical to business approval or
  human UAT; a fictitious PASS is impossible.

# 5. Methodology policy

- **BR-13.** The methodology is determined by the product. The selection groups (testing, review, architecture, delivery, approval-policy) are independent of one another; alternatives in one group are mutually exclusive, additions are compatible.
- **BR-14.** Profile inheritance is explicit and selective: a separate group or a separate
  methodology of another product. Implicit full inheritance through a shared repository
  is not applied. An inheritance conflict — a question to the owner, not the rule
  "the last loaded wins".
- **BR-15.** A task-scoped override is an agreed temporary exception for a specific
  task and product: it does not change the permanent profile, other products, permissions
  or security gates.

# 6. Materialization and evidence

- **BR-16.** After a content operation a readable result remains, or
  an explicitly recorded update of an existing one; the file/record must exist, be readable and
  comply with its own contract. The presence check and the semantic check are
  different checks.
- **BR-17.** Acceptance criteria and evidence have stable identifiers;
  agreed and applied criteria are not changed imperceptibly in such a way that the old
  `passed` starts to mean new behavior.
- **BR-18.** Each actual run of a check, manual session, UAT verdict or
  review is a separate piece of evidence with its own identity; old results are not rewritten
  for a new run.

# 7. Delivery and consumers

- **BR-19.** VP is delivered through three channels: a separate plugin, a build into the agent
  delivery package, a public marketplace channel.
- **BR-20.** Initialization of VP in a project is context-dependent: Standalone — a managed
  YAML block in the project instruction file; agent delivery — the config file of the
  agent runtime; host layer — the project config file built from templates.
- **BR-21.** `packages/powers` is a project package and is registered in the shared
  root configurations of the repository; `packages/plugin` remains the layer to the Codex
  host and is not part of the VP registration.

# 8. Non-functional requirements

- **NFR-01.** VP has no infrastructure of its own: the runtime, the bundler, the package
  manager, the CLI framework and the test runner are taken from the project.
- **NFR-02.** The code shipped in the skills works without a build under Bun, Node
  or Deno: only standard `node:` modules, no external dependencies.
- **NFR-03.** Shipped code reads JSON catalogs and typed records plus Markdown instruction
  frontmatter; it does not read CSV. The development-only donor intake may parse CSV only from
  explicitly inventoried, pinned source paths. YAML remains limited to human manifests.
- **NFR-04.** Instructions, profiles and registries have stable identifiers and
  versions; a change of content does not change the identifier.
- **NFR-05.** Evidence and change logs are bound to a specific revision;
  the change log is a separate artifact, not part of the main text of the document.
- **NFR-06.** No change in the product is introduced without the owner's approval.

# 9. Boundaries (out of scope)

- **BR-22.** The accepted scope includes the bounded engineering/UX, product and business
  instruction pack in D14 and the selected typed reference families in D15. Product/business
  source families require individual research, fidelity, rights and owner-admission decisions;
  inclusion of a domain never promotes historical exclusions automatically. A general-purpose
  knowledge platform, unselected domains, the future UI over the VIDA API (§9.3), external
  issue-tracker synchronization (§8.3), and unselected reference data remain out of scope.
- **BR-23.** VP Runtime mode requires registration of the product in the repository and
  a runtime request; until they are performed, the Standalone part is proven.

# 10. Open questions

| ID | Question | State |
|---|---|---|
| BR-Q1 | Which exact tags and groups form the initial set of the profile? | **Resolved 2026-10-22:** the groups and their alternatives are declared in `packages/powers/config/methodology-profile.json` (D10, `packages/powers/docs/decisions/D10-policy-choices-and-model-inventory.md`). |
| BR-Q2 | Which set of instructions is considered minimally sufficient for the first version? | **Resolved 2026-10-22:** applying the owner's step D coverage criterion in `packages/powers/docs/task-plan-step-d.md` (an instruction covers both actions and behaviour; donor skills/files are split into atomic instructions; templates and prompts into rules) produced a corpus of 2510 instructions from 8 donors. The count does not establish minimal sufficiency. |
| BR-Q3 | Who actually holds the role "Vida Powers owner"? | **Resolved 2026-10-19:** the role is performed by the repository owner; the unit of registration is the **role**, not the person, so a handover is possible without rewriting the ownership map (D2). |

---

**Synchronization with research.** This document is the B-level (why). The behavior
is recorded in `system-specification.md`. An S change that changes the intent entails an update of
research (§7.1) and an impact assessment (§7.6); a research change that changes a requirement entails an
update of S. Duplication of normative text is forbidden.
