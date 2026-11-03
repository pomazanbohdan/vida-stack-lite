---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-solid
title: Apply SOLID at class and module level
summary: "SRP, OCP, LSP, ISP and DIP constrain class and module dependencies."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing or reviewing classes and module interfaces.
conditions_does_not_apply_when: A generated data class with no behavior or clients.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each principle is applied or its violation is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L116-L140"
status: active
revision: 1
---

# Apply SOLID at class and module level

Apply the five class- and module-level principles: SRP gives a module one reason to change by serving one actor; OCP extends behavior with new code rather than modifying existing code; LSP requires subtypes to work through the base interface without clients knowing, and is violated by unexpected exceptions or ignored methods; ISP keeps clients from depending on methods they do not use; DIP makes high- and low-level modules depend on abstractions defined by the high-level module.
