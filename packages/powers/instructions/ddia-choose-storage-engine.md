---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-storage-engine
title: Choose the storage engine from workload trade-offs
summary: "Match LSM trees, B-trees, column stores or in-memory stores to read and write amplification, analytics and SSD durability costs."
capability_tags:
  - improve-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: Selecting a storage engine or index for a known workload.
conditions_does_not_apply_when: A storage engine fixed by the deployment platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The choice names the dominant read/write pattern and the amplification or SSD-write cost it accepts.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L54-L74"
status: active
revision: 1
---

# Choose the storage engine from workload trade-offs

Choose storage engines according to workload trade-offs: LSM trees favor write throughput with read amplification, B-trees balance reads and writes with write amplification, and column stores support analytics. Consider SSD write cycles and the encoding overhead avoided by in-memory systems.
