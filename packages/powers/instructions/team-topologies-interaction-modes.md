---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-interaction-modes
title: Declare one interaction mode per team pair
summary: "Use collaboration, X-as-a-Service or facilitating; declare one mode for every interacting pair, time-box collaboration to one at a time, and evolve the mode as the interface stabilizes."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: Two teams depend on each other for delivery or discovery.
conditions_does_not_apply_when: A one-off question that creates no ongoing dependency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each dependent pair has one declared mode, collaboration is time-boxed, and the intended mode transition is stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L75-L97"
status: active
revision: 1
---

# Declare one interaction mode per team pair

Use exactly three team interaction modes: collaboration for close joint discovery, X-as-a-Service for consuming another team's offering over a clear interface, and facilitating for helping another team learn or improve. Choose and explicitly declare one mode for every interacting team pair. Time-box costly collaboration and limit each team to one collaboration at a time. Use X-as-a-Service for established interfaces, not while a boundary is unknown; deliberately shift from collaboration to X-as-a-Service as the interface stabilizes. Treat persistent friction as a sensing signal: awkward collaboration may indicate a wrong boundary, and a clunky service may need platform product work. A temporary, declared return to collaboration is the standard way to adopt a major new platform capability.
