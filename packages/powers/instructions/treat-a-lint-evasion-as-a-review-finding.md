---
instruction_id: treat-a-lint-evasion-as-a-review-finding
title: Treat a lint evasion as a review finding
summary: "Writing the code in a shape the rule cannot see is a finding, not a fix, and an exemption is not added to silence it."
capability_tags:
  - review-code
pattern_tags:
  - automated-enforcement
conditions_applies_when: A lint rule does not fire on a call it should have caught.
conditions_does_not_apply_when: The rule fires and is being satisfied.
artifact_contract_output_type: evasion-finding
artifact_contract_required_data:
  - the shape the rule cannot see
  - the underlying call that must be fixed
artifact_contract_verified_by: the underlying call is fixed and no exemption was added for the evasion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-a-raw-terminator-finding.md
status: active
revision: 1
---

# Treat a lint evasion as a review finding
These are documented gaps, not sanctioned escape hatches. Writing code in one of these shapes to route around the rule reopens exactly the defect class the rule exists to close, and is a review finding — fix the underlying call the same way any other raw terminator would be fixed, do not rely on the lint being unable to see it.
Do not add a third entry to make an inconvenient finding go away.
