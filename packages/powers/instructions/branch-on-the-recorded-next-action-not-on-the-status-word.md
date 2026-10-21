---
instruction_id: branch-on-the-recorded-next-action-not-on-the-status-word
title: "Branch on the recorded next action, not on the status word"
summary: "When the run meets a state it does not recognise, it reads the recorded next action and follows it; it never decides from the status word alone."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The run meets a status it does not recognise or a route that is not a pass.
conditions_does_not_apply_when: The state is one of the known outcomes.
artifact_contract_output_type: next-action-route
artifact_contract_required_data:
  - the recorded next action
  - the route it produced
artifact_contract_verified_by: the route came from the recorded next action and not from the status word
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/autonomous.md
status: active
revision: 1
---

# Branch on the recorded next action, not on the status word
A non-passed route after it is a real blocker
Branch on the owner's answer, never on a status word
