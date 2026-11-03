---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-general-interfaces
title: Make interfaces general enough but not speculative
summary: "Cover current uses with the simplest interface, push complexity downward, and avoid configuration that offloads decisions to callers."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a module interface or reviewing its configurability.
conditions_does_not_apply_when: An interface already fixed by a caller contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface covers current uses without speculative generality or configuration parameters that shift decisions to callers.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L98-L119"
status: active
revision: 1
---

# Make interfaces general enough but not speculative

Choose an interface general enough for current uses but not speculative future needs; ask for the simplest interface covering current needs. Push complexity downward, avoid configuration parameters that offload decisions to callers, and favor the simpler somewhat general-purpose approach when uncertain.
