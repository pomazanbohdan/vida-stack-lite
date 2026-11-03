---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-separate-derived-data
title: Separate the system of record from derived data
summary: "Use batch for bounded data and streams for unbounded events, and make derived data rebuildable with CDC, stream-table duality, idempotence and windowing."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a data pipeline or deriving data from a system of record.
conditions_does_not_apply_when: A one-off report that is not maintained as derived data.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The system of record is distinct from derived data, and derived data can be rebuilt from the source."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L143-L166"
status: active
revision: 1
---

# Separate the system of record from derived data

Use batch processing for bounded datasets and stream processing for unbounded events; separate the system of record from rebuildable derived data. Account for dataflow engines, CDC, stream-table duality, idempotence or transactional output for exactly-once behavior, and windowing.
