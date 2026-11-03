---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-common-mistakes
title: Avoid common data-system mistakes
summary: "Avoid popularity-driven database choices, ignored replication lag, indiscriminate distributed transactions, universal hashing, assumed serializability, conflated batch and stream, and undifferentiated faults."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a data-intensive system for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the workload-matched correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L189-L200"
status: active
revision: 1
---

# Avoid common data-system mistakes

Avoid choosing databases by popularity, ignoring replication lag, using distributed transactions indiscriminately, hashing every partition, assuming serializable isolation, confusing batch with stream, or treating all faults as recoverable; apply the listed workload-matched corrections.
