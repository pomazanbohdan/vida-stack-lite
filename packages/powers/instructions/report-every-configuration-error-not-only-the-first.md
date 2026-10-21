---
instruction_id: report-every-configuration-error-not-only-the-first
title: "Report every configuration error, not only the first"
summary: A malformed configuration prints one error per defect and stops; it never falls back to a default.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A configuration is rejected before the work starts.
conditions_does_not_apply_when: The configuration is valid.
artifact_contract_output_type: configuration-errors
artifact_contract_required_data:
  - every defect
  - the rule index and the offending value
artifact_contract_verified_by: every collected defect is printed and no default was silently used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 1
---

# Report every configuration error, not only the first
prints one error per defect (all of them, not just the first) and stops — it never silently falls back to a default depth.
Each printed error names the rule index (and, where applicable, the offending path or depth value) so you can find the exact entry to fix without guessing which rule in the array is broken.
