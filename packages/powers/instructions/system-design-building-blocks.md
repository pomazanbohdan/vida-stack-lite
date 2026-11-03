---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-building-blocks
title: Introduce building blocks only for their bottleneck
summary: "Use standard blocks with known tradeoffs, and add a block only when its specific bottleneck appears rather than multiplying failure modes upfront."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Selecting load balancers, caches, queues, hashing or other system blocks."
conditions_does_not_apply_when: A block required by an external contract or platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each introduced block addresses a named bottleneck and its failure modes are stated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L73-L96"
status: active
revision: 1
---

# Introduce building blocks only for their bottleneck

Use standard system building blocks while recognizing each block's tradeoff; introduce a block only when its specific bottleneck appears, since adding all blocks upfront multiplies failure modes. The section describes load balancing, caches, queues and consistent hashing, among others.
