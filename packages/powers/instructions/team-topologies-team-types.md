---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-team-types
title: Classify every team as one of four types
summary: "Use stream-aligned, enabling, complicated-subsystem and platform teams; default to stream-aligned, justify the others by load removed, and apply each type's stated limits."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: "Defining or reviewing a team's charter and purpose."
conditions_does_not_apply_when: A temporary working group with no ownership or delivery role.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every team has exactly one of the four types, non-stream types state the load they remove, and the stated limits are respected."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L52-L74"
status: active
revision: 1
---

# Classify every team as one of four types

Classify every team as one of four types: stream-aligned teams own a business-change flow end to end and are the primary type; enabling teams grow stream-aligned capabilities then move on; complicated-subsystem teams encapsulate deep specialist knowledge; platform teams provide an internal product that reduces stream-aligned teams' cognitive load. Default to stream-aligned teams; justify the other types only by the load they remove. Measure enabling teams by capabilities transferred, not tickets, and prevent permanent dependency. Use complicated-subsystem teams only for genuine specialism, never managerial convenience; most organizations need zero or one. A platform should reduce stream load, and is a liability if adoption is harder than self-hosting. Avoid shared-services ticket bottlenecks, an intervening DevOps silo, and component teams that force every feature across many teams.
