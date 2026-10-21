---
instruction_id: split-the-phase-instead-of-shrinking-the-decision
title: Split the phase instead of shrinking the decision
summary: "When the work does not fit, the phase is split and proposed to the owner; nothing is quietly left out."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The planned work does not fit into the available budget.
conditions_does_not_apply_when: The work fits.
artifact_contract_output_type: phase-split-proposal
artifact_contract_required_data:
  - the sub-phases
  - the grouping
artifact_contract_verified_by: the split is proposed and nothing was silently omitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Split the phase instead of shrinking the decision
Never Simplify User Decisions — Split Instead
Do NOT silently omit features. Instead:
Propose how to split: which item groups form natural sub-phases
The orchestrator presents the split to the user for approval
