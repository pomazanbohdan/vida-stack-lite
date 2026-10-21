---
instruction_id: allow-only-three-legitimate-reasons-to-shrink-the-plan
title: Allow only three legitimate reasons to shrink the plan
summary: "Context cost, missing information and a dependency conflict are the only reasons to leave work out; difficulty is not one of them."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A piece of work is left out of the plan.
conditions_does_not_apply_when: Nothing was left out.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the reason for leaving the work out
artifact_contract_verified_by: every omission names one of the three reasons
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Allow only three legitimate reasons to shrink the plan
The planner has no authority to judge a feature as too difficult, omit features because they seem challenging, or use "complex/difficult/non-trivial" to justify scope reduction.
Context cost: implementation would consume >50% of a single agent's context window
Missing information: required data not present in any source artifact
Dependency conflict: feature cannot be built until another phase ships
If a feature has none of these three constraints, it gets planned. Period.
