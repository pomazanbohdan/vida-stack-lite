---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-concentric-circles
title: Organize code in concentric circles
summary: "Use Entities, Use Cases, Interface Adapters and Frameworks/Drivers; dependencies point inward and boundary data favors the inner circle."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Structuring an application into architectural layers.
conditions_does_not_apply_when: A single-layer script with no architectural boundary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The layers form concentric circles, dependencies point inward, and boundary data uses the inner form."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L22-L44"
status: active
revision: 1
---

# Organize code in concentric circles

Organize architecture as concentric circles with Entities innermost, then Use Cases, Interface Adapters, and Frameworks and Drivers outermost; source dependencies must always point inward. Inner circles must not mention outer-circle names, classes, functions, variables, or data formats, and boundary data must use the form most convenient for the inner circle rather than the outer. Define interfaces inward and implement them outward through Dependency Inversion. The number of circles is not fixed (four is typical); frameworks are details in the outermost circle. This direction lets high-level policies survive changes to databases, web frameworks, and API styles.
