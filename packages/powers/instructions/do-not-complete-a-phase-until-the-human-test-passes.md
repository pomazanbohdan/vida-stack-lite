---
instruction_id: do-not-complete-a-phase-until-the-human-test-passes
title: Do not complete a phase until the human test passes
summary: The phase stays pending while the items that need a person are untested.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: All automatic checks passed and a number of items still need a person to test them.
conditions_does_not_apply_when: "Every check, including the manual ones, has passed."
artifact_contract_output_type: pending-item
artifact_contract_required_data:
  - the items that need a person
  - the phase state
artifact_contract_verified_by: the phase stayed pending while the items were untested
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Do not complete a phase until the human test passes
All automated checks passed.
require human testing before this phase can be marked complete
The phase remains pending. No further orchestrator action
