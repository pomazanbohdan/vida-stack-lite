---
instruction_id: use-the-formal-review-skill-for-the-formal-review-move
title: Use the formal review skill for the formal review move
summary: The formal review move runs the most appropriate formal review skill that is installed.
capability_tags:
  - review-code
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer picks the move that runs a formal review.
conditions_does_not_apply_when: No formal review skill is installed for the kind of work under review.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the formal review skill that was used
artifact_contract_verified_by: the move was carried out by the installed formal review skill and not improvised
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Use the formal review skill for the formal review move
Formal review: Use the most appropriate formal review skill available. If it's code and the code-review skill is installed, prefer that unless the user says otherwise.
