---
instruction_id: run-the-review-lenses-over-the-whole-diff
title: Run the review lenses over the whole diff
summary: "The code lenses are run over the whole diff instead of being reimplemented, and the boundaries between the pieces of work are weighted, because no single session saw both sides."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A retrospective reads back a body of work that spans several changes.
conditions_does_not_apply_when: The body of work is a single change that was already reviewed.
artifact_contract_output_type: diff-scope-review
artifact_contract_required_data:
  - the lenses that ran
  - the findings they produced
  - the narrowing when they could not be run
artifact_contract_verified_by: the whole diff went through the code lenses and the boundaries between the pieces of work were weighted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the review lenses over the whole diff
Diff-scope review — do not reimplement review.
Invoke the review skill
on the epic's diff for the code lenses (adversarial, edge-case, verification-gap), weighting the boundaries between tickets, where no single session ever saw both sides. Fold its findings in.
If the review skill is unavailable
run those lenses inline over the diff on a narrowed scope and record the narrowing.
