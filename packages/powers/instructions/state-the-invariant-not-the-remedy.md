---
instruction_id: state-the-invariant-not-the-remedy
title: "State the invariant, not the remedy"
summary: "A finding states the property that was violated and quotes the evidence; the remedy is only an example, so it can be satisfied in another way."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A finding is written about a plan or a change.
conditions_does_not_apply_when: The finding is a plain observation without a violated property.
artifact_contract_output_type: invariant-bound-finding
artifact_contract_required_data:
  - the violated property
  - the quoted evidence
  - the example route
artifact_contract_verified_by: the finding names the property and the property is not already satisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/few-shot-examples/plan-checker.md
status: active
revision: 1
---

# State the invariant, not the remedy
The checker stated the invariant that failed (`required_property`), cited the specific dimension (task_completeness), quoted the problematic text as evidence, explained why it is a blocker (executor cannot determine what to build), and gave a concrete example route with file paths and function names.
because the binding payload is the property rather than the example, the planner may satisfy it a different way.
The `required_property` it states is already satisfied, which is the tell: scope_sanity allows 2-3 tasks per plan -- 3 tasks is within limits.
The checker applied a personal preference ("smaller is better") rather than the documented threshold.
