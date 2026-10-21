---
instruction_id: track-the-outcome-of-a-decision-when-it-becomes-known
title: Track the outcome of a decision when it becomes known
summary: "A recorded decision carries its outcome: proved correct, to be revisited, or too early to evaluate."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A decision is recorded and time passes.
conditions_does_not_apply_when: The decision has not been made yet.
artifact_contract_output_type: decision-outcome
artifact_contract_required_data:
  - the outcome of the decision
  - the state the outcome is in
artifact_contract_verified_by: the decision carries one of the three outcomes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/project.md
status: active
revision: 1
---

# Track the outcome of a decision when it becomes known
- Track outcome when known:
✓ Good — decision proved correct
⚠️ Revisit — decision may need reconsideration
— Pending — too early to evaluate
