---
instruction_id: a-cheaper-configuration-is-not-a-quality-claim
title: A cheaper configuration is not a quality claim
summary: "A change in price, quota or limits is a cost trade-off; it is not evidence that the quality of the result changed."
capability_tags:
  - define-quality-bar
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A configuration is changed because it is cheaper or because it consumes less of a limit.
conditions_does_not_apply_when: The configuration was changed because the result itself became better.
artifact_contract_output_type: tradeoff-statement
artifact_contract_required_data:
  - what changed
  - which dimension it changed
artifact_contract_verified_by: the change is stated as a cost or limit trade-off and no quality claim is made from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/configure-model-profiles.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
  - operations
---

# A cheaper configuration is not a quality claim
These are cost/limit tradeoffs, not quality claims.
it did not alter model quality.
