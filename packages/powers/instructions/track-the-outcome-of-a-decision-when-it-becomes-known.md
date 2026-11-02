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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Track the outcome of a decision when it becomes known
- Track outcome when known:
✓ Good — decision proved correct
⚠️ Revisit — decision may need reconsideration
— Pending — too early to evaluate
