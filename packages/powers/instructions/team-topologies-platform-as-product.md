---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-platform-as-product
title: Run the platform as an internal product
summary: "Start from the Thinnest Viable Platform, judge it by cognitive load removed, keep adoption optional, treat internal developers as customers, and sense when the topology must change."
capability_tags:
  - design-team-organization
pattern_tags:
  - internal-platform-product
conditions_applies_when: "Forming, operating or reviewing an internal platform team."
conditions_does_not_apply_when: A mandated shared service with no product relationship to its users.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The platform's customers, TVP scope, adoption model and sensing signals are stated, and load removed is the success measure."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L146-L169"
status: active
revision: 1
---

# Run the platform as an internal product

Run the platform as an internal product for stream-aligned teams, starting with the Thinnest Viable Platform: the smallest accelerator, which may be curated documentation and vetted services. Use friction, wait times, and on-call signals to sense when team boundaries or interaction modes should change. Judge a platform by cognitive load removed rather than features shipped; build software only when curation is insufficient. Treat internal developers as customers through user research, a roadmap, SLAs, and adoption and developer-experience metrics. Keep adoption optional so the platform competes on value. Treat shadow platforms, increasing wait times, recurring cross-team friction, and on-call pain as evolution signals. Revisit boundaries and modes every few quarters in response to signals rather than ceremony.
