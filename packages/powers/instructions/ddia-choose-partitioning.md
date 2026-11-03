---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-partitioning
title: Choose partitioning by access pattern
summary: "Balance key-range and hash partitioning against range scans, hotspots, secondary-index costs and rebalancing."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Sharding data or diagnosing hot partitions.
conditions_does_not_apply_when: Data that fits on one node and has no partitioning decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The partitioning choice matches the access pattern and states its hotspot, index and rebalancing costs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L99-L119"
status: active
revision: 1
---

# Choose partitioning by access pattern

Select partitioning by access pattern: key ranges preserve range scans but can create sequential-key hotspots; hashing distributes load but loses sort order. Account for local-index scatter-gather, global-index cross-partition updates, hot keys and rebalancing.
