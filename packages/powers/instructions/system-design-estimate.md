---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-estimate
title: Estimate capacity before committing
summary: "Estimate QPS, storage, bandwidth and server count with powers of two, latency values and simple arithmetic, and round for order of magnitude."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Choosing an architecture whose capacity or cost matters.
conditions_does_not_apply_when: A design whose capacity is fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The estimate states its assumptions and gives order-of-magnitude QPS, storage, bandwidth and server counts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L49-L72"
status: active
revision: 1
---

# Estimate capacity before committing

Before committing to an architecture, estimate QPS, storage, bandwidth and server count using powers of two, latency values and simple arithmetic. Use the given formulas and round aggressively for order-of-magnitude estimates rather than precision.
