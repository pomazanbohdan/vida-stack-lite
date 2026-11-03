---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-boundaries
title: Draw boundaries between policy and details
summary: "Use reciprocal interfaces, Humble Object, inward dependencies and volatility points; services are not automatically boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Placing an architectural boundary or integrating a service.
conditions_does_not_apply_when: A boundary already fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The boundary separates policy from detail, dependencies point inward and the placement tradeoff is stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L141-L163"
status: active
revision: 1
---

# Draw boundaries between policy and details

A boundary separates what matters from details and uses polymorphism: dependencies cross inward, while control flow may cross either way. Full boundaries use reciprocal interfaces on both sides; partial boundaries may use a simpler strategy or facade. Use the Humble Object pattern to separate hard-to-test boundary code from easy-to-test logic. A service is not automatically an architectural boundary; a microservice with a fat shared data model remains a monolith with network calls. Tests are the most isolated component: they depend inward and nothing depends on them. Avoid premature boundaries, but draw them at likely volatility points. Main is the composition root that assembles concrete implementations.
