---
instruction_id: score-the-change-risk-and-scale-the-review-with-it
title: Score the change risk and scale the review with it
summary: "The plan records the risk of the change as the business impact if it is wrong, and that score is what decides how much review the change gets."
capability_tags:
  - plan-implementation
pattern_tags:
  - verification-before-completion
conditions_applies_when: The investigation is done and the change is about to be planned.
conditions_does_not_apply_when: The change is too small to carry a risk score.
artifact_contract_output_type: change-risk-score
artifact_contract_required_data:
  - the risk level of the change
  - the business impact if the change is wrong
  - the reason for the level
artifact_contract_verified_by: the recorded risk level states the business impact if the change is wrong
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Score the change risk and scale the review with it

Then score the change's `risk` for `{plan_file}` frontmatter: `low`, `medium`, or `high`, the business impact if this change is wrong.

Raise it when the investigation shows more; go below it only when the user says so.

- A CI process can read it to decide how much review the change gets
