---
instruction_id: verify-the-doc-claims-against-the-live-codebase
title: Verify the doc claims against the live codebase
summary: "Every document, generated or hand-written, is checked against the live codebase."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: Documentation has been written and its claims are about to be trusted.
conditions_does_not_apply_when: The document is a plan that describes intent rather than the system.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the claims checked
  - the failures found
artifact_contract_verified_by: every document in the set was checked against the live codebase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 1
---

# Verify the doc claims against the live codebase
Verify factual claims in ALL docs — both canonical (generated) and non-canonical (existing hand-written) — against the live codebase.
This is NOT optional.
