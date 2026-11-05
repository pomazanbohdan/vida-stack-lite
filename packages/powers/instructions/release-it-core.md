---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-core
title: Design for graceful degradation
summary: "Every system is eventually pushed past its limits; production-ready software must degrade gracefully, stay observable and keep operating through partial failures without human intervention."
capability_tags:
  - design-production-readiness
pattern_tags:
  - graceful-degradation
conditions_applies_when: A system claimed as production-ready.
conditions_does_not_apply_when: A prototype with no production claim.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design names how partial failures are absorbed without human intervention.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L14-L17"
status: active
revision: 1
---

# Design for graceful degradation

Every system will eventually be pushed beyond its design limits, so the design question is not whether failures occur but whether the system degrades gracefully or collapses. Production-ready software must be resilient and observable and must keep operating through partial failures without human intervention; correctness alone is insufficient.
