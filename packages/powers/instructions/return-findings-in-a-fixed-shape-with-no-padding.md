---
instruction_id: return-findings-in-a-fixed-shape-with-no-padding
title: Return findings in a fixed shape with no padding
summary: "The findings come back in one fixed shape in the conversation, an empty list with a passing verdict is a valid answer, and a finding is advice rather than a gate."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - code-review
conditions_applies_when: A lens or a review returns its result.
conditions_does_not_apply_when: The result is spoken to the user rather than returned as a structured result.
artifact_contract_output_type: findings-report
artifact_contract_required_data:
  - the lens name
  - the verdict
  - "the findings with their severity, location, evidence and fix"
artifact_contract_verified_by: "the result has the fixed shape, and an empty findings list is allowed when the verdict passes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-contract.md
status: active
revision: 1
---

# Return findings in a fixed shape with no padding
Return exactly this JSON in-context, never as a file
"severity": "Critical | Important | Minor",
An empty `findings` array with a passing verdict is valid. Padding is worse than silence.
Findings are advice to the user, never a gate; the gates are the validators and the trigger eval.
