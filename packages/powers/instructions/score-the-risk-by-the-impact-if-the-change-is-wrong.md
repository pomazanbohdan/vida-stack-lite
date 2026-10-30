---
instruction_id: score-the-risk-by-the-impact-if-the-change-is-wrong
title: Score the risk by the impact if the change is wrong
summary: The risk of a change is the business impact if it is wrong; an inherited risk may be raised by the investigation but never lowered.
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The change is about to be planned and its risk has to be recorded.
conditions_does_not_apply_when: The risk was already scored and cannot change.
artifact_contract_output_type: risk-score
artifact_contract_required_data:
  - the risk level
  - the business impact if the change is wrong
artifact_contract_verified_by: the recorded risk names the level and the impact that produced it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Score the risk by the impact if the change is wrong
Score the change's risk:
low, medium, or high, the business impact if this change is wrong
Raise it when the investigation shows more
