---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-contracts
title: State and enforce contracts at boundaries
summary: "State preconditions, postconditions and invariants; fail early and do not use assertions for expected errors."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Defining or reviewing module boundaries and public operations.
conditions_does_not_apply_when: Internal helpers with no contract exposed outside their module.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Contract violations fail early and expected errors use normal error handling.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L100-L123"
status: active
revision: 1
---

# State and enforce contracts at boundaries

State preconditions, postconditions and invariants at boundaries; validate assumptions with assertions, fail early when contracts are violated, and do not use assertions for expected runtime errors.
