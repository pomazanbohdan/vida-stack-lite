---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-design-for-faults
title: Design for faults without assuming failure
summary: "Distinguish faults from failures, account for correlated software faults and human error, tune timeouts and preserve safety properties."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: Designing reliability or fault tolerance for a distributed system.
conditions_does_not_apply_when: A component that has no availability or fault-tolerance requirement.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design distinguishes faults from failures, states its fault assumptions and preserves safety properties."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L167-L188"
status: active
revision: 1
---

# Design for faults without assuming failure

Design for faults and preserve correct operation despite component faults. Distinguish faults from system failures, account for correlated software faults and human error, tune timeouts, preserve safety properties, and choose fault assumptions appropriate to the system.
