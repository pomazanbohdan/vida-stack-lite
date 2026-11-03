---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: one-page-marketing-score
title: Score only when every square has a criterion
summary: "Apply the Quick Diagnostic to its six squares, check the referenced template for the other three, and score only if all nine have explicit criteria; otherwise name the unresolved squares."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: Scoring a one-page marketing plan against the nine-square template.
conditions_does_not_apply_when: A template that explicitly defines criteria for all nine squares.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - unresolved-squares
artifact_contract_verified_by: "The report applies the six diagnostic rows, checks the referenced template for the other three, and either states a defensible score or names the unresolved squares."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/one-page-marketing/SKILL.md; sha256=6fc2ef69e1ef36377eebcaea65d172049adc3f5a9806c8254d02b5565d899793; locator=skills/one-page-marketing/SKILL.md#L20-L334"
status: active
revision: 1
---

# Score only when every square has a criterion

Apply the Quick Diagnostic to its six corresponding squares and report that it does not provide a row for the other three. Check the referenced nine-square template and exercise for explicit criteria before deciding those squares; do not invent criteria. Report a score when the source provides enough criteria to judge all nine squares, and otherwise identify the unresolved squares and explain why the score cannot be determined.
