---
instruction_id: publish-the-consolidated-review-report
title: Publish the consolidated review report
summary: "Fold the reviewers’ files into one report, grade it from the rubric verdicts and the severity counts, and write both the rendered report and the markdown twin."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Every selected reviewer has returned and their files have to become one report.
conditions_does_not_apply_when: The findings are to stay in the conversation.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the grade
  - the synthesis
  - the dimension sections
  - the reviewer sections
  - the mechanical notes
artifact_contract_verified_by: "the report exists in both forms, the grade follows the rubric verdicts and the individual reviewer files are preserved"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/references/validate.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/headless-schemas.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Publish the consolidated review report
Once every selected reviewer has returned, the parent synthesizes one consolidated report.
Do not skip this step under Validate intent — it produces the persistent artifact the user opens.
Grade derived from the rubric verdicts and severity counts:
*Excellent* = all dimensions strong/adequate, no Critical or Important findings
*Good* = ≤1 thin dimension, no Critical findings
*Fair* = multiple thin dimensions or any Important finding
*Poor* = any broken dimension or any Critical finding
Synthesis block. Lift the rubric's *Overall verdict* paragraph as the lead; if adversarial or ad-hoc reviewers materially shift the picture, add a second paragraph that names what they surfaced.
Adversarial findings keep their adversarial voice — do not soften.
Mechanical notes. Bullet list from the rubric's "Mechanical notes" section. Skip the block if empty.
Footer. Rubric path, ISO timestamp.
Re-running validation overwrites the consolidated report in place.
The individual
files are preserved so the user can drill in.
Write the markdown twin to
the report path
(same content, grouped by severity rather than by dimension - see format below;
this is the canonical form for downstream re-reading).
The
validation report is always written -
the path is required, not optional.
If the command fails, don't retry with another opener: tell the user the file path and move on.
Surface artifact paths; the rendered HTML/markdown is the persistent artifact. Always offer to roll findings into an Update.
