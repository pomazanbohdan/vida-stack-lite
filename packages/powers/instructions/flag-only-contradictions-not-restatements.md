---
instruction_id: flag-only-contradictions-not-restatements
title: "Flag only contradictions, not restatements"
summary: Two artifacts that say the same thing differently are not drift; only a contradiction between them is.
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two planning artifacts state the same kind of fact.
conditions_does_not_apply_when: Only one artifact holds the fact.
artifact_contract_output_type: cross-artifact-drift
artifact_contract_required_data:
  - the two locations
  - the contradiction
  - the authority that decides
artifact_contract_verified_by: only a contradiction was flagged and every restatement was left alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Flag only contradictions, not restatements
Two passages that merely read alike, or that restate one fact at different levels of detail, are NOT drift.
Only a contradiction is.
single-source is the target state, not a finding
that axis is skipped and the skip is recorded in the same "Verification coverage" block
A clean pass must never mean "nothing was compared."
Completeness is terminal: when exactly one side says the phase is complete, the verdict is drifted and never lag, however few steps apart the two words look.
