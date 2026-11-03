---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-replication
title: Choose replication with explicit trade-offs
summary: "State consistency, availability and latency trade-offs; account for leader bottlenecks, conflict resolution, lag anomalies and failover loss."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: "Designing replication for fault tolerance, scalability or latency reduction."
conditions_does_not_apply_when: A single-node deployment with no replication decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The replication design states its consistency, availability, latency and failover-loss trade-offs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L75-L98"
status: active
revision: 1
---

# Choose replication with explicit trade-offs

Choose replication strategy with explicit consistency, availability and latency trade-offs. Account for leader bottlenecks, conflict resolution, replication-lag anomalies, synchronous durability costs, asynchronous failover loss, and the correctness guarantees of conflict-resolution methods.
