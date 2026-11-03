---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-operations
title: Treat operations and recovery as design concerns
summary: "Design health checks, monitoring, logging, deployment, disaster recovery and redundancy with explicit recovery objectives and autoscaling bounds."
capability_tags:
  - design-structure
pattern_tags:
  - operational-telemetry
conditions_applies_when: Designing the operational side of a production system.
conditions_does_not_apply_when: A prototype that will not be operated.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design states recovery objectives, deployment and multi-datacenter choices, and minimum and maximum autoscaling counts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L146-L169"
status: active
revision: 1
---

# Treat operations and recovery as design concerns

Treat health checks, monitoring, logging, deployment, disaster recovery and redundancy as first-class design concerns. Define recovery objectives, select deployment and multi-datacenter strategies with their tradeoffs, and set both minimum and maximum autoscaling counts.
