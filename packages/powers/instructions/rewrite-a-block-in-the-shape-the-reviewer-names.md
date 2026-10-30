---
instruction_id: rewrite-a-block-in-the-shape-the-reviewer-names
title: Rewrite a block in the shape the reviewer names
summary: "A rejected shape is rewritten the way the reviewer describes it, and the constraint is carried into every later block."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer rejects the shape of a block and says what shape they want.
conditions_does_not_apply_when: The reviewer asked for a change in the content rather than in the shape.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the rewritten block
  - the constraint recorded for the later blocks
artifact_contract_verified_by: "the block was rewritten in the named shape in both the session and the narrative, and the constraint is in the log"
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

# Rewrite a block in the shape the reviewer names
If they reject a block's shape, rewrite that block in the shape they describe, in both the session and the narrative, and record the constraint in the log so it applies to every later block.
Do not present the same block a third time in a different shape without being asked.
