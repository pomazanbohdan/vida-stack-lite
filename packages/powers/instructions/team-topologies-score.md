---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-score
title: Score the organization against the topology principles
summary: "Rate the organization and team designs 0-10, report the score and the changes needed to reach 10, and apply the five stated bands from 9-10 to 0-2."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an existing organization or a proposed team design.
conditions_does_not_apply_when: A single team retrospective that does not assess the topology.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - improvement-changes
artifact_contract_verified_by: "The report states the current score, the band it falls in, and the specific changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the organization against the topology principles

Rate organization and team designs from 0 to 10 against the stated principles and report both the current score and the specific changes needed to reach 10. Apply these bands: 9–10 means end-to-end stream-aligned teams sized to cognitive load, other team types only remove that load, and interaction modes are explicit and evolve deliberately; 7–8 means mostly stream-aligned with a real platform but some shared ownership, undeclared modes, or one overloaded team; 5–6 means team types are named but boundaries follow technology layers, collaboration is unbounded, or platform adoption is mandated; 3–4 means component teams, ticket-driven shared services, or changes crossing several teams; 0–2 means the organization ignores Conway's law through project staffing churn, everyone-talks-to-everyone communication, or no cognitive-load concept.
