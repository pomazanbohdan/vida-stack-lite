---
instruction_id: state-what-a-skip-costs
title: State what a skip costs
summary: "When the user skips a preparation step, the weaker context they will get is named before the run continues."
capability_tags:
  - communicate-concisely
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The user is offered the option to skip a preparation step.
conditions_does_not_apply_when: No step was offered to skip.
artifact_contract_output_type: skip-notice
artifact_contract_required_data:
  - the step that was skipped
  - the weaker context it leaves behind
artifact_contract_verified_by: the consequence of the skip is stated before the run continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/onboard.md
status: active
revision: 1
---

# State what a skip costs
Skipping codebase mapping may give downstream steps weaker context
Skip mapping — continue with weaker onboarding context
