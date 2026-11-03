---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-error-handling
title: Separate error handling from business logic
summary: "Prefer exceptions with context, avoid returning or passing null, and use explicit alternatives."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "Designing or reviewing error paths, exceptions and null handling."
conditions_does_not_apply_when: An external error contract that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Error paths are explicit and business logic is not mixed with handling.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L107-L131"
status: active
revision: 1
---

# Separate error handling from business logic

Separate error handling from business logic; prefer exceptions to return codes, include contextual information, and avoid returning or passing null. Prefer unchecked exceptions, define exception types around caller needs, and use empty values, Optional, exceptions or a Null Object as appropriate.
