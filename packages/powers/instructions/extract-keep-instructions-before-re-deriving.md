---
instruction_id: extract-keep-instructions-before-re-deriving
title: Extract keep instructions before re-deriving
summary: "What worked in the rejected attempt is extracted as keep instructions before the code is derived again, and the logged constraints are respected."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The work is re-derived after the plan was amended.
conditions_does_not_apply_when: The work is not being re-derived.
artifact_contract_output_type: keep-instructions
artifact_contract_required_data:
  - the keep instructions
  - the logged constraints that were respected
  - the amendment entry
artifact_contract_verified_by: the keep instructions were extracted before the revert and carried into the next derivation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Extract keep instructions before re-deriving
Before reverting code: extract KEEP instructions for positive preservation (what worked well and must survive re-derivation).
Revert code changes.
Read the `## Plan Change Log` in `{plan_file}` and strictly respect all logged constraints when amending the sections outside `<intent-contract>` that contain the root cause.
