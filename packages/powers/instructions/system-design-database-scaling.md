---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-database-scaling
title: Scale the database from its access pattern
summary: "Choose SQL or NoSQL from data shape and access, scale vertically first, then replicate or shard according to read/write patterns and tradeoffs."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Choosing a database or scaling one beyond a single node.
conditions_does_not_apply_when: A database fixed by an external platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The database and scaling choice match the data shape and access pattern, with denormalization justified by read dominance."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L97-L120"
status: active
revision: 1
---

# Scale the database from its access pattern

Choose SQL or NoSQL based on data shape and access patterns. Scale vertically first, then use replication or sharding when vertical limits are reached; choose the replication and shard strategy according to read/write patterns and tradeoffs. Denormalize when reads dominate and data changes rarely.
