---
instruction_id: drop-a-phase-that-is-project-management-theater
title: Drop a phase that is project-management theater
summary: "Coordination, ceremonies, documentation-for-its-own-sake and change management are not delivery phases; they are deleted rather than planned."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: "A candidate phase names coordination, ceremony or process rather than a delivered capability."
conditions_does_not_apply_when: The item delivers a capability that users or systems consume.
artifact_contract_output_type: phase-structure
artifact_contract_required_data:
  - the dropped phase
  - the reason it was dropped
artifact_contract_verified_by: "no phase in the structure is coordination, ceremony or process work"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-roadmapper.md
status: active
revision: 1
---

# Drop a phase that is project-management theater
NEVER include phases for:
- Team coordination, stakeholder management
- Sprint ceremonies, retrospectives
- Documentation for documentation's sake
- Change management processes
If it sounds like corporate PM theater, delete it.
