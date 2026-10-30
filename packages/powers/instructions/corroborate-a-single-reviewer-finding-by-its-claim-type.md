---
instruction_id: corroborate-a-single-reviewer-finding-by-its-claim-type
title: Corroborate a single-reviewer finding by its claim type
summary: "A finding raised by one reviewer counts only when its kind earns it: a claim about what exists has to be confirmed, a judgement about design does not."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: One reviewer raised a serious finding and the loop counts it.
conditions_does_not_apply_when: "Two or more reviewers raised it, or the finding is not serious."
artifact_contract_output_type: corroboration-gate
artifact_contract_required_data:
  - the kind of the claim
  - what corroborated it
  - the finding when it did not count
artifact_contract_verified_by: "a single-reviewer finding counted only on the corroboration its kind requires, and one that did not count was still listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Corroborate a single-reviewer finding by its claim type
Classify each newly raised finding by what the claim ASSERTS, not by whether it happens to contain a file:line citation:
asserts that a named symbol, file, path, flag, commit, or ID exists, is absent, or says something specific
asserts a design or correctness property
A serious finding raised by 2+ reviewers is corroborated and always counts.
counts only if the source-grounding pass independently confirms it against real project source
counts UNLESS that reviewer's own section OPENS with an evidence-quality discount marker blockquote
FAIL OPEN: if EVERY reviewer that ran this cycle carries a discount marker, this gate does not apply at all — count as if it were absent.
A gate must never manufacture convergence out of a cycle in which nothing was verified.
