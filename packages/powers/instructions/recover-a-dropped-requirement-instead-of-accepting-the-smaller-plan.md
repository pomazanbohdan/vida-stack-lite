---
instruction_id: recover-a-dropped-requirement-instead-of-accepting-the-smaller-plan
title: Recover a dropped requirement instead of accepting the smaller plan
summary: "A requirement the plan does not cover blocks the plan, and the dropped requirement is recovered and re-injected rather than quietly left out."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan is written against a set of requirements.
conditions_does_not_apply_when: Every requirement is covered by at least one item of the plan.
artifact_contract_output_type: requirement-coverage
artifact_contract_required_data:
  - the requirement that is not covered
  - the item of the plan that covers it
  - the re-injection that recovered it
artifact_contract_verified_by: no uncovered requirement was left behind and the report names the ones that lacked coverage
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/scope-reduction-detection.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/requirements-coverage-gate.md
status: active
revision: 1
---

# Recover a dropped requirement instead of accepting the smaller plan
System MUST prohibit planners from reducing scope without explicit justification
System MUST have plan-checker verify requirement dimension coverage
System MUST have orchestrator recover dropped requirements and re-inject them
System MUST implement three-layer defense: planner prohibition, checker dimension, orchestrator recovery
System MUST verify each requirement appears in at least one PLAN.md
Uncovered requirements MUST block planning completion
System MUST report which specific requirements lack plan coverage
