---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-data-outlives-code
title: Treat data as the durable asset
summary: "Prioritize long-term data correctness, durability and evolvability, and make consistency, availability and latency trade-offs explicit."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Choosing a data store or designing a data-intensive system whose data will outlive the application.
conditions_does_not_apply_when: A disposable dataset whose loss or rewrite has no lasting consequence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design states the data volume, complexity, change rate and explicit consistency, availability and latency trade-offs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat data as the durable asset

Prioritize long-term correctness, durability and evolvability of data because data outlives applications. Identify data volume, complexity, change rate and explicit consistency, availability and latency trade-offs.
