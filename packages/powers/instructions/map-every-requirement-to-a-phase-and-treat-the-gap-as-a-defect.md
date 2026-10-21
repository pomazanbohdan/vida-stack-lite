---
instruction_id: map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect
title: Map every requirement to a phase and treat the gap as a defect
summary: Each requirement maps to exactly one phase and the unmapped count is reported.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The roadmap is checked against the requirement set.
conditions_does_not_apply_when: The roadmap has no requirements to map.
artifact_contract_output_type: traceability-table
artifact_contract_required_data:
  - each requirement with its phase
  - the unmapped count
artifact_contract_verified_by: every requirement maps to exactly one phase and the unmapped count is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/requirements.md
status: active
revision: 1
---

# Map every requirement to a phase and treat the gap as a defect
Each requirement maps to exactly one phase
Unmapped requirements = roadmap gap
**Coverage:** - v1 requirements: [X] total - Mapped to phases: [Y] - Unmapped: [Z] ⚠️
