---
instruction_id: sweep-every-dimension-or-name-it-deferred
title: Sweep every dimension or name it deferred
summary: "Every dimension the level owns is decided, deferred or an open question; a dimension left silent is the failure."
capability_tags:
  - design-structure
pattern_tags:
  - dimension-sweep
conditions_applies_when: A contract is being written at a level that owns a known set of dimensions.
conditions_does_not_apply_when: The artefact is a note rather than a contract with dimensions to cover.
artifact_contract_output_type: dimension-sweep
artifact_contract_required_data:
  - the dimensions
  - the decisions
  - the deferred ones
  - the open questions
artifact_contract_verified_by: no dimension of the level is silent and no placeholder stands in for one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/references/reviewer-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/opencode-v2-verification-matrix.md
status: active
revision: 2
---

# Sweep every dimension or name it deferred
Sweep the breadth the altitude owns — every structural dimension is decided, deferred, or an open question
a whole dimension left silent (e.g. the operational/environmental envelope: deployment & environments, infra/provider strategy, operations) is the failure, not a clean spine.
every dimension the altitude owns is decided, deferred, or an open question — a whole dimension left silent is a finding, especially the operational/environmental envelope (deployment & environments, infra/provider strategy, operations) a domain-focused draft skips.
No placeholders; never invent to fill a gap.
- **Implemented** (rows B9, B10, C2) | Needed only tool, session and shell events the plugin already receives.
- **Not applicable** | It blocks a GSD executor dispatch that omits harness-managed worktree isolation. OpenCode's descriptor declares `dispatch.isolation: orchestrator-worktree`, so GSD manages the worktree and the guard would never act.
- **Waived** | 2.x keeps the `lsp` setting but runs no language servers and exposes no LSP tools; there is nothing to wire.
