---
okf_version: "0.2"
---

# Vida Powers — product documentation

Documentation bundle for the Vida Powers product in Open Knowledge Format v0.2.
Concepts — research and the implementation plan; change history — in the bundle
log. Format, trust, lifecycle and provenance are recorded in the frontmatter of
each concept.

# Concepts

* [Vida Powers — task-level plan for step C: catalog, operations, seed corpus](task-plan-step-c.md) - Step-by-step implementation: schemas, frontmatter parser, `catalog.*` operations, deterministic `decision.evaluate`, seed corpus, converter and validator.
* [Vida Powers — task-level plan for step D: vertical slice of the corpus](task-plan-step-d.md) - Donor processing in phases: inventory, selection, segmentation into atomic instructions, deduplication of duplicates, batch approval of tags, materialization by the converter, and validation.
* [Vida Powers — task-level plan for step E: skills vp-mode and vp-setup, setup, manifests](task-plan-step-e.md) - Source and effective methodology profile, the setup skill, the orchestration skill, per-host manifests and the marketplace.
* [Vida Powers — next actions within packages/powers](next-actions.md) - Current scope of work in the product catalog: harness and skeleton, canonical documents, catalog with scripts, full eight-donor corpus, skills and manifests, Work Items and findings, runtime requests.
* [Vida Powers — instruction catalog design](catalog-design.md) - Package structure, instruction format, catalog operations, interaction with the methodology profile, validation, tests and packaging.
* [Vida Powers — business requirements](business-requirements.md) - B-level: goals, boundaries of responsibility, autonomy constraints, methodology policy, delivery, non-functional requirements.
* [Vida Powers — system specification](system-specification.md) - S-level: instruction model, catalog operations, Decision Provider, routing, methodology profile, materialization, findings, operational rules.
* [Vida Powers — acceptance criteria](acceptance.md) - Verifiable conditions bound to SR, with the kind of evidence, type and state; separately — what we do not prove.
* [Vida Powers — traceability matrix](traceability.md) - The link research § → BR → SR → AC and of decisions D1–D13 (and D4b) to normative clauses.
* [Vida Powers — implementation plan](implementation-plan.md) - Order of stages, gates and acceptance criteria of the implementation: from product registration and canonical documents to corpus conversion, Router, materialization, Runtime integration and Standalone mode.
* [Vida Powers — product concept and architectural baseline](research/vida-powers-product-research.md) - The finalized concept: the boundaries of VP and VIDA Runtime, the canonical instruction corpus with two tag dimensions, methodology policy, artifact-first materialization, Findings, wiki/work layout and Configured/Dynamic modes.

# Log

* [Bundle updates](log.md) - Chronology of documentation concept changes: date, kind of change, what exactly changed.

# Decisions

* [D1 — Placement of the Vida Powers product](decisions/D1-product-placement.md) - VP lives in `packages/powers` as the third product of the repository; `packages/plugin` remains the Codex layer between the Codex host and the agent.
* [D2 — Ownership and workspace model of VP in the monorepo](decisions/D2-ownership-and-work-space.md) - Monorepo of products: each plugin has its own owner, documentation, task set and workspace; VP Work Items — in the product, coordination — in the repository.
* [D3 — VP instruction catalog: a standalone plugin and an extended registry in the agent package](decisions/D3-instruction-catalog-and-registry.md) - VP keeps its own catalog and its own scripts for finding and using instructions; in the mode of building into the agent delivery package, the agent package must have its own extended instruction registry.
* [D4 — VP delivery channels: separate plugin, build into the agent package, marketplace](decisions/D4-delivery-channels.md) - Three delivery channels in scope; the VP skill surface: `vp-mode` (the main orchestration skill) and `vp-setup` (the auxiliary setup one).
* [D4b — VP marketplace owner and the host set of the first release](decisions/D4b-marketplace-and-hosts.md) - `packages/powers` is itself the marketplace owner; Codex — the verified first host, the rest — declared support.
* [D5 — Decision Provider and routing in VP: provider-neutral interface, LLM selection and agent formation](decisions/D5-decision-provider.md) - The `decision.evaluate` contract with two implementations and a mandatory Agent Fallback; routing = LLM selection, agent formation and the flow level.
* [D6 — Product change log: a bundle log per Open Knowledge Format](decisions/D6-bundle-change-log.md) - The change history of VP concepts is kept in `docs/log.md` per OKF §9.
* [D7 — Environment-driven VP initialization: three configuration carriers](decisions/D7-consumer-initialization.md) - `vp-setup` writes into the project instruction file, the config file of the agent runtime, or the project config file of the host layer.
* [D8 — Methodology profile: one VP schema, carrier per environment](decisions/D8-methodology-profile.md) - `VPMethodologyProfile/v1` — a VP-owned schema; the carrier depends on the environment.
* [D9 — Work scope: only packages/powers, registration in root files deferred](decisions/D9-scoped-to-powers.md) - The scope of work is limited to the product catalog; registration in the shared root files of the repository — an external dependency.
* [D10 — Policy choices, executor ladder and the managed block](decisions/D10-policy-choices-and-model-inventory.md) - Opposite approval policies live in the corpus as alternatives of one group and the user chooses them at setup; the verification ladder is other provider family → other model of the same provider → blind agent on the same model, with the setup recording the available models; the managed block carries a JSON payload so no YAML parser is needed; the setup hooks are deferred with a condition.
* [D11 — Product language: documentation in English, instructions from the donor originals](decisions/D11-product-language.md) - All product documentation is maintained in English; corpus instructions are not translated but taken from the original donor texts; tags, schemas, error codes and terms are in English.
* [D12 — Opposing instructions are declared, not narrowed away](decisions/D12-declared-conflicts.md) - Two instructions that state opposite rules are declared as a conflicting pair: each names the other, the pair shares one theme pattern tag, and the catalogue reports the pair by name instead of applying both.
* [D13 — One canonical severity scale: Critical / Important / Minor](decisions/D13-canonical-severity-scale.md) - The severity of a finding is expressed on one scale across the corpus; the domain scales of the donors and the earlier groups of the corpus are rewritten to it, the criteria of every level kept verbatim.

# Outside the bundle

* [Donor sources manifest](../donors.yaml) - Exact revisions of the eight donor repositories (7 methodological + Open Knowledge Format), licenses and file counters. Not an OKF concept: it is a machine manifest of sources for corpus conversion.
