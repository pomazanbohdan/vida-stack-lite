---
instruction_id: read-the-source-before-you-apply-the-review-suggestion
title: Read the source before you apply the review suggestion
summary: "The reported issue is re-read in the current file before the change is made, and the change is adapted to the code that is actually there."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A reported defect is about to be fixed.
conditions_does_not_apply_when: The change is a mechanical rename that the file states directly.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the file read
  - the line read around
  - the adaptation
artifact_contract_verified_by: the file was read before the edit and the finding was skipped when the context no longer matched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the source before you apply the review suggestion
Read the actual source file at the cited line (plus surrounding context — at least +/- 10 lines)
Understand the current code state — check if code matches what reviewer saw
Adapt the fix suggestion to the actual code if it has changed or differs from review context
Mark finding as "skipped: code context differs from review"
