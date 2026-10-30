---
instruction_id: grade-against-the-explicit-predicates-never-a-restated-goal
title: "Grade against the explicit predicates, never a restated goal"
summary: "A grading step is measured against the predicates the specification states, not against a goal the grader restates for itself."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Something grades the work against a goal.
conditions_does_not_apply_when: The goal itself is what is being written and there is no predicate to grade against yet.
artifact_contract_output_type: grading-basis
artifact_contract_required_data:
  - the explicit predicates
  - the restatement that is not used
  - the source of the grading signal
artifact_contract_verified_by: the grading ran against the explicit predicates and not a restated goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/design/verifier-reach.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Grade against the explicit predicates, never a restated goal
- Grading must be **against the spec's explicit predicates**, never a self-restatement.
- **Do not** let the verifier grade a restated goal; grade against explicit predicates (test-tier checks, judgment-tier flags).
- Confidence-gating cannot rescue this: the model is ~0.93-confident and wrong, so there is no threshold that separates its hits from its misses.
