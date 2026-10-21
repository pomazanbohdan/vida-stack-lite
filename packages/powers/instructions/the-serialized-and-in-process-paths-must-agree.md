---
instruction_id: the-serialized-and-in-process-paths-must-agree
title: The serialized and the in-process path must agree
summary: The out-of-process path returns the same result as the in-process one for the same inputs; that consistency is the contract.
capability_tags:
  - harden-validation
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: The same operation can run in-process or across a process boundary.
conditions_does_not_apply_when: Only one of the two paths exists.
artifact_contract_output_type: parity-result
artifact_contract_required_data:
  - the inputs
  - the result of each path
artifact_contract_verified_by: both paths return the same result for the same inputs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/author-a-host-plugin.md
status: active
revision: 1
---

# The serialized and the in-process path must agree
The result is identical to the in-process negotiation for the same axes - that consistency is the contract.
