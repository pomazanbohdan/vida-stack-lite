---
instruction_id: stop-the-convergence-loop-when-the-concern-count-stops-falling
title: Stop the convergence loop when the concern count stops falling
summary: "The loop ends when the Critical-concern count reaches zero, and a count that stops falling is a stall the run reports."
capability_tags:
  - review-code
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A review and replan loop runs until the concerns are closed.
conditions_does_not_apply_when: A single review round is enough.
artifact_contract_output_type: convergence-verdict
artifact_contract_required_data:
  - the concern count per cycle
  - the state the loop ended in
artifact_contract_verified_by: "the loop ended on a zero count, a stall warning or an escalation, and the state is named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop the convergence loop when the concern count stops falling
The loop exits when the Critical-concern count reaches zero.
**Stall detection:** if the Critical-concern count is not decreasing across cycles, the run warns you.
When the cycle cap is reached with open Critical concerns, an escalation gate asks whether to proceed or review manually.
