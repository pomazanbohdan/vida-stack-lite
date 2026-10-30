---
instruction_id: cross-check-two-scopes-and-add-what-one-missed
title: Cross-check two scopes and add what one missed
summary: "Two independent scopes are compared, and whatever one of them did not surface is warned about and added, so a partial result cannot mask the rest of the work."
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two scopes describe the same work and one of them may be partial.
conditions_does_not_apply_when: Only one scope exists.
artifact_contract_output_type: scope-cross-check
artifact_contract_required_data:
  - the two scopes
  - the files the first scope missed
  - the files added
artifact_contract_verified_by: no file in the second scope is missing from the first after the cross-check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Cross-check two scopes and add what one missed
Cross-check the SUMMARY scope against it and warn about (then add) any in-scope files the SUMMARY extractor did not surface - so a partial SUMMARY result can no longer silently mask the rest of the phase.
