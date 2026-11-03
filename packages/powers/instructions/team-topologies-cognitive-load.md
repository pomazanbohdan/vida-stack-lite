---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-cognitive-load
title: Size responsibilities and software to cognitive load
summary: "Account for intrinsic, extraneous and germane load; count domains rather than headcount; keep one complicated domain per team, publish a team API, and prefer long-lived teams."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: "Assigning domains, services or ownership to a team."
conditions_does_not_apply_when: A staffing decision that does not change ownership or domain scope.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The team holds at most one complicated domain, simple domains stay within two or three, and the software is split rather than the team enlarged."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L98-L121"
status: active
revision: 1
---

# Size responsibilities and software to cognitive load

Match each team's responsibilities to its cognitive capacity and size software to the team, not the reverse. Account for intrinsic load from skills and technology, extraneous load from delivery mechanics, and germane load from value-adding domain thinking; minimize extraneous load, account for intrinsic load, and protect germane capacity. Measure domains rather than headcount: assign at most one complicated domain to a team, allow two or three simple domains, and do not split one complicated domain across teams. Address overload by reducing domains rather than enlarging teams; split software that exceeds team capacity. Provide team APIs through code, documentation, on-call information, channels, and working agreements. Prefer long-lived teams and move work when projects end. Respect approximate group sizes of 5-9 people per team and natural grouping limits near 15, 50, and 150. Use paved roads, templates, and platform services to reduce extraneous load.
