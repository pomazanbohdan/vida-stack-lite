---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-dependency-rule
title: Point source dependencies inward
summary: Source-code dependencies point toward higher-level policies; inner circles know nothing of outer circles.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Laying out modules, packages or layers."
conditions_does_not_apply_when: A dependency fixed by an external platform that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every source dependency points inward and inner code does not mention outer types or formats.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L14-L17"
status: active
revision: 1
---

# Point source dependencies inward

Source-code dependencies must point inward toward higher-level policies; inner circles must not know anything about outer circles. This keeps business rules independent of frameworks, UI, databases, and other external agencies, so details can depend on policies and implementations can be deferred or swapped while business logic remains independently testable.
