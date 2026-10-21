---
instruction_id: list-the-things-that-look-done-but-are-not
title: List the things that look done but are not
summary: The features that appear complete but miss a critical piece are listed as a checklist for the execution.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The domain has no known false-completion traps.
artifact_contract_output_type: false-completion-checklist
artifact_contract_required_data:
  - each feature
  - the piece that is usually missing
  - the check that catches it
artifact_contract_verified_by: each listed feature names the missing piece and the check that catches it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 1
---

# List the things that look done but are not
Things that appear complete but are missing critical pieces.
Checklist format for verification during execution
Common in demos vs. production
Prevents "it works on my machine" issues
