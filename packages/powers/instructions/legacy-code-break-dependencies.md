---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-break-dependencies
title: Use the least invasive dependency-breaking technique
summary: "Choose interface extraction, parameterization, override, delegation or adaptation that unblocks instantiation or sensing before tests exist."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A dependency blocks testing of existing behavior.
conditions_does_not_apply_when: A dependency change that alters observable behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The chosen technique is the least invasive one that makes the behavior testable, and existing callers keep working."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L123-L146"
status: active
revision: 1
---

# Use the least invasive dependency-breaking technique

Use the least invasive dependency-breaking technique that unblocks instantiation or sensing before tests exist. The source lists interface extraction, parameterization, factory/getter override, instance delegation, parameter adaptation, method objects, and subclass override; production defaults can preserve existing callers, and dynamic-language seams may substitute for several techniques.
