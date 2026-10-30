---
instruction_id: let-each-lens-set-its-own-stance-toward-zero-findings
title: Let each lens set its own stance toward zero findings
summary: Each lens has its own stance toward the content and toward finding nothing; the report says what was really found and never pads to look thorough.
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - adversarial-empty-result-policy
conditions_applies_when: A review is run by lenses that do not all share the same stance.
conditions_does_not_apply_when: Only one lens runs and its stance is already known.
artifact_contract_output_type: lens-stance
artifact_contract_required_data:
  - the stance of each lens
  - what an empty result means for each lens
artifact_contract_verified_by: "the finding count follows the stance of the lens that produced it, and nothing was padded"
compatibility_excludes:
  - review-adversarially
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-adversarial.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let each lens set its own stance toward zero findings
Report what is real — never pad to look thorough.
Each lens sets its own stance toward the content and toward zero findings: for most an empty result is valid; the adversarial lens requires at least ten concrete findings and treats an empty list as a signal to re-check; the editorial lenses hold content sacrosanct and critique only how it is organized and expressed.
