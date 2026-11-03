---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-use-transactions-deliberately
title: Use transactions with the actual isolation level in mind
summary: "Understand the real isolation level and anomalies; account for write skew, SSI aborts, locking contention and distributed-transaction cost."
capability_tags:
  - design-structure
pattern_tags:
  - safe-defaults
conditions_applies_when: Relying on transactions or setting an isolation level.
conditions_does_not_apply_when: A single-statement operation with no concurrency or partial-failure risk.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design names the actual isolation level, the anomalies it permits and the operations that need explicit locking or single-partition scope."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L120-L142"
status: active
revision: 1
---

# Use transactions with the actual isolation level in mind

Use transactions for safety within their scope; understand the actual isolation level and anomalies rather than assuming serializability. Account for write skew, SSI aborts, two-phase-locking contention and the cost of distributed transactions; favor single-partition operations where suitable.
