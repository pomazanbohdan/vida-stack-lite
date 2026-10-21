---
instruction_id: verify-that-every-deferral-has-a-destination
title: Verify that every deferral has a destination
summary: A deferral that names a destination that does not exist is a scope that was dropped without a home.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: The artifacts defer work to a later part of the work.
conditions_does_not_apply_when: No artifact defers anything.
artifact_contract_output_type: deferral-check
artifact_contract_required_data:
  - the deferral
  - the destination it names
  - the check that the destination exists
artifact_contract_verified_by: every deferral names a destination that exists
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 1
---

# Verify that every deferral has a destination
For each match, extract the referenced phase number.
Cross-reference against
flag as deferred scope not captured.
