---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-risk-plan
title: Plan the riskiest test and pivot trigger
summary: "For each plan, identify the riskiest assumption, its test, the validation metric and the fallback, and define pivot triggers upfront."
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: Planning product work under uncertainty.
conditions_does_not_apply_when: A plan with no meaningful assumption risk.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - riskiest_assumption
  - test
  - metric
  - fallback
artifact_contract_verified_by: "The plan names the riskiest assumption, its test, metric and fallback before work starts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L228-L239"
status: active
revision: 1
---

# Plan the riskiest test and pivot trigger

For each plan, identify the riskiest assumption, how to test it, a metric to validate/invalidate it, whether a smaller test is possible, and what happens if it fails; define pivot triggers upfront.
