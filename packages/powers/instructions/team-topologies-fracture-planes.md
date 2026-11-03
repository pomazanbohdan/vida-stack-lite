---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-fracture-planes
title: Split software along fracture planes
summary: "Default to business-domain splits, use another plane only for a concrete forcing reason, test each boundary as an independent service, and give every artifact one owner."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: "Splitting a monolith, a service or a repository between teams."
conditions_does_not_apply_when: A code-internal module boundary with no ownership consequence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The chosen plane and its forcing reason are stated, the independent-service test is applied, and each artifact has one owner."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L122-L145"
status: active
revision: 1
---

# Split software along fracture planes

Split software along natural fracture planes so each piece can be fully owned by one team. Use business domain (DDD bounded context) as the default; use regulatory compliance, change cadence, team location/timezone, risk, performance isolation, technology, or user personas only when appropriate. Prefer business-domain splits and choose another plane only for a concrete forcing reason. Technology is usually the worst plane because layer-based splits force features across teams. Test proposed boundaries by asking whether each piece could be offered as an independent service or SaaS; if not, the boundary leaks. Address monolithic databases, coupled release trains, and mandatory organization-wide standardization because they impede team independence. Give every artifact one owner, extract it to a platform, or run it as inner source with a steward. Different system parts may use different planes.
