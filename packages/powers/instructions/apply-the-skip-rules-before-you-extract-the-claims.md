---
instruction_id: apply-the-skip-rules-before-you-extract-the-claims
title: Apply the skip rules before you extract the claims
summary: "Marked, example and placeholder claims are filtered while they are extracted; a check that cannot run is a skip, not a failure."
capability_tags:
  - verify-work-results
pattern_tags:
  - scope-routing
conditions_applies_when: Claims are extracted from a document for verification.
conditions_does_not_apply_when: The document has no skipped or placeholder claims.
artifact_contract_output_type: verification-result
artifact_contract_required_data:
  - the checked claims
  - the skipped claims
  - the failures
artifact_contract_verified_by: the skip rules were applied during extraction and the failure count matches the failure list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-verifier.compact.md
status: active
revision: 1
---

# Apply the skip rules before you extract the claims
Apply skip rules BEFORE extraction. Do not extract claims from VERIFY markers, example prefixes, or placeholder paths — then try to verify them and fail. Apply the rules during extraction.
Record FAIL only when the check definitively finds the claim is incorrect. If verification cannot run (e.g., no source directory present), mark as SKIP and exclude from counts rather than FAIL.
`claims_failed` MUST equal `failures.length`. Validate before writing.
