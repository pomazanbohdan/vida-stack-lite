---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: continuous-discovery-test-assumptions
title: Test the riskiest assumptions first
summary: "Identify what a solution depends on, map assumptions by importance and evidence, and test the riskiest ones before building."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: "A solution depends on untested customer, business or technical assumptions."
conditions_does_not_apply_when: An assumption already supported by direct evidence.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - assumptions
  - tests
artifact_contract_verified_by: The riskiest assumptions are tested before the solution is built.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/continuous-discovery/SKILL.md; sha256=44260b572a050417ba3733021eaa1694318fda80794c3e07800c66b4bc4a0c9e; locator=skills/continuous-discovery/SKILL.md#L97-L121"
status: active
revision: 1
---

# Test the riskiest assumptions first

Before building, identify the assumptions a solution depends on, map them by importance and evidence, then run small fast tests on the riskiest ones first.
