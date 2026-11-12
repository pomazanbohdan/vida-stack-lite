---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-team-topologies-skill-md-1e3cd46f-c02"
title: "wondelai-skills: skills/team-topologies/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/team-topologies/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/team-topologies/SKILL.md\"}"
atom_ids:
  - team-topologies-platform-as-product
  - team-topologies-score
  - team-topologies-team-types
atom_count: 3
atoms: "[{\"atom_id\":\"team-topologies-platform-as-product\",\"file_sha256\":\"42a7e054773f6468fc69922746f8ca9de783d120063bfdc78d6909447ad897f6\",\"content_sha256\":\"978de14b1cf8514bde2a747b78f815facfa3127202fb85bb0d53e47ff300fece\",\"file_bytes\":2134,\"body_bytes\":865},{\"atom_id\":\"team-topologies-score\",\"file_sha256\":\"97c10c04d7a08d6f536447a6877cc2bf665d2fe766ccc1936724895d735c5706\",\"content_sha256\":\"a3fb22c4cc9b6455499d28984ce117e8350709d6119ad9b2809310a3ef0e5f93\",\"file_bytes\":2148,\"body_bytes\":913},{\"atom_id\":\"team-topologies-team-types\",\"file_sha256\":\"205a4515e384817c758349b569518a8318c70fbb7117be2b92c627cd5b6eac76\",\"content_sha256\":\"7210ed54a871adff8c3e147dd3b0345fe7455747d28496a82f5648ac7e980365\",\"file_bytes\":2173,\"body_bytes\":940}]"
carrier_sha256: 2db31f5f9ecf89b4e31b9e09a43f16532df7d74547d44b3f28b8821cc4f29f2d
carrier_bytes: 6792
revision: 1
status: active
---
<!-- vpmodule:atom:begin team-topologies-platform-as-product -->
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
<!-- vpmodule:atom:end team-topologies-platform-as-product -->
<!-- vpmodule:atom:begin team-topologies-score -->
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
<!-- vpmodule:atom:end team-topologies-score -->
<!-- vpmodule:atom:begin team-topologies-team-types -->
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
<!-- vpmodule:atom:end team-topologies-team-types -->