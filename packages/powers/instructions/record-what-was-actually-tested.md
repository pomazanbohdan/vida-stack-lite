---
instruction_id: record-what-was-actually-tested
title: Record what was actually tested
summary: "The record names the checks that ran, their results, and what is still unverified."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A test move finished and the outcome has to be written down.
conditions_does_not_apply_when: Nothing was tested in this move.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - what was actually tested
  - the results
  - anything still unverified
artifact_contract_verified_by: the entry names the unverified part instead of leaving it out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 1
---

# Record what was actually tested
Record what was actually tested, the results, and anything still unverified.
