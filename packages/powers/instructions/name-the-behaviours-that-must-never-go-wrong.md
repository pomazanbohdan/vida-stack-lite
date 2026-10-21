---
instruction_id: name-the-behaviours-that-must-never-go-wrong
title: Name the behaviours that must never go wrong
summary: The design contract names the handful of behaviours that absolutely cannot go wrong in this system.
capability_tags:
  - clarify-requirements
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A system design contract is written.
conditions_does_not_apply_when: The contract covers a change with no behaviour that can go wrong.
artifact_contract_output_type: critical-failure-modes
artifact_contract_required_data:
  - the behaviours that absolutely cannot go wrong
artifact_contract_verified_by: at least three critical failure modes are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 1
---

# Name the behaviours that must never go wrong
**Critical Failure Modes:**
<!-- The 3-5 behaviors that absolutely cannot go wrong in this system -->
[ ] Critical failure modes identified (≥ 3)
