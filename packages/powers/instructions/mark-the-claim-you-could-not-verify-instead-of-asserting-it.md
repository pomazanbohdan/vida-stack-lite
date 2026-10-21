---
instruction_id: mark-the-claim-you-could-not-verify-instead-of-asserting-it
title: Mark the claim you could not verify instead of asserting it
summary: An infrastructure claim the repository cannot settle carries a marker; nothing about the code is invented.
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: A documentation file is written about a project.
conditions_does_not_apply_when: The claim was read from the repository.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the marked claims
artifact_contract_verified_by: every unverifiable claim carries a marker and no path or value was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
status: active
revision: 1
---

# Mark the claim you could not verify instead of asserting it
Place `<!-- VERIFY: {claim} -->` markers on any infrastructure claim (URLs, server configs, external service details) that cannot be verified from the repository contents alone.
Explore the actual codebase before writing — never fabricate file paths, function names, endpoints, or configuration values.
