---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-team-topologies-skill-md-1e3cd46f-c01"
title: "wondelai-skills: skills/team-topologies/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/team-topologies/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/team-topologies/SKILL.md\"}"
atom_ids:
  - team-topologies-apply
  - team-topologies-cognitive-load
  - team-topologies-common-mistakes
  - team-topologies-core-principle
  - team-topologies-diagnostic
  - team-topologies-fracture-planes
  - team-topologies-interaction-modes
  - team-topologies-inverse-conway
atom_count: 8
atoms: "[{\"atom_id\":\"team-topologies-apply\",\"file_sha256\":\"5c09a3f12ff62f5ad95acf7921f94ad1ea88a75b70c21f5a5978150c02a34cc3\",\"content_sha256\":\"357adfc9732247571e49267bcaae76079846d356d29d28bb0755d88a97d1bf73\",\"file_bytes\":1590,\"body_bytes\":338},{\"atom_id\":\"team-topologies-cognitive-load\",\"file_sha256\":\"1d75be7cd1a062bb75862ab4e174806a6e437ff062c2a96c9a039f76d36d9011\",\"content_sha256\":\"a576981c686eefa6a161b9558dc99a99d3a880b0752aeb724561d68c7e392b91\",\"file_bytes\":2301,\"body_bytes\":1024},{\"atom_id\":\"team-topologies-common-mistakes\",\"file_sha256\":\"5a36004c12d81d83796fc1513f5eceed78bcddfaaf348dd16130b7b3a3032c4a\",\"content_sha256\":\"872dd37042bf00233361695f4d50a98deb43938bd7430be5cedee231fea5fddb\",\"file_bytes\":2005,\"body_bytes\":787},{\"atom_id\":\"team-topologies-core-principle\",\"file_sha256\":\"199a25a7baa1fc8855bdce0f8540a79441af73f7d2dd6b1b64a20e5b3f0f34ea\",\"content_sha256\":\"fae941123f26ef0a75825e5293d7b83f7a5a76385c504bfb86aadb300cebde6c\",\"file_bytes\":1668,\"body_bytes\":406},{\"atom_id\":\"team-topologies-diagnostic\",\"file_sha256\":\"61ded9bce8232410d0c06b87f2e849ed303096638f08ddc55154b983e01a132e\",\"content_sha256\":\"6ffdc22c1abe8821cb7e486bbdb8e7b6767556aee578476f46677b5cbdc24e64\",\"file_bytes\":2286,\"body_bytes\":975},{\"atom_id\":\"team-topologies-fracture-planes\",\"file_sha256\":\"b13a182bd630634b904fd64718fff221e6abac53a51ada933a73ef6ed05b64c4\",\"content_sha256\":\"eef28a824be51ce5063a0fa939a45f2df36d9f8b551fd2aa4cf0c634e768aa5e\",\"file_bytes\":2189,\"body_bytes\":945},{\"atom_id\":\"team-topologies-interaction-modes\",\"file_sha256\":\"c99edf20de0a69340194a92aa5159fdb1a032bccbf9764d5e218abe8ffb82e6b\",\"content_sha256\":\"a7a0903df6caf7fd2cbe25140d39f9ca192a0874ce95004a968989b091c0d24e\",\"file_bytes\":2087,\"body_bytes\":846},{\"atom_id\":\"team-topologies-inverse-conway\",\"file_sha256\":\"2e794695aa58685954400a9196af34d88d0cfd754936c093c50a248e3391d1bb\",\"content_sha256\":\"d82b6af9cb8b9a5f76c6d61cb9327fbf1355abd63e4f5a19796c131c974679a9\",\"file_bytes\":2074,\"body_bytes\":758}]"
carrier_sha256: b12214abba249bfa023d770af6e2b25e937fa24714f3f6c601c34eaced811532
carrier_bytes: 17127
revision: 1
status: active
---
<!-- vpmodule:atom:begin team-topologies-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-apply
title: Apply Team Topologies to organization design
summary: "Structure engineering organizations for fast flow with four team types, three interaction modes, Conway's law and team cognitive load, and keep the topology evolving."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: Designing or reorganizing engineering teams and their boundaries.
conditions_does_not_apply_when: A local team process change that leaves boundaries and interactions unchanged.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design names the team types, interaction modes and load limits it uses, and states how the topology will keep evolving."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply Team Topologies to organization design

Use the Team Topologies team-first approach to structure engineering organizations for fast flow of change, with deliberate attention to four team types, three interaction modes, Conway's law, and team cognitive load. Keep evolving the topology as the system, technology, and market shift.
<!-- vpmodule:atom:end team-topologies-apply -->
<!-- vpmodule:atom:begin team-topologies-cognitive-load -->
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
<!-- vpmodule:atom:end team-topologies-cognitive-load -->
<!-- vpmodule:atom:begin team-topologies-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-common-mistakes
title: Avoid the listed organizational mistakes
summary: "Avoid the DevOps silo, permanent enabling teams, mandated platform adoption, technology-layer splits, disbanding teams, ticket-queue shared services, headcount sizing and implicit interaction modes, and apply each stated fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing an organization or team design for known failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L170-L182"
status: active
revision: 1
---

# Avoid the listed organizational mistakes

Avoid an intermediary DevOps silo, permanent enabling teams, mandated platform adoption, technology-layer team splits, disbanding teams when projects end, shared-services ticket queues, sizing by headcount instead of cognitive load, and implicit interaction modes. Address these by using self-service platform or enabling teams as appropriate, time-boxing enabling work with exit criteria, keeping platform adoption optional, aligning ownership to business domains, keeping teams long-lived and moving work to them, turning shared services into a platform product or enabling function, counting and classifying domains (with at most one complicated domain per team), and declaring and deliberately reviewing each team pair's interaction mode.
<!-- vpmodule:atom:end team-topologies-common-mistakes -->
<!-- vpmodule:atom:begin team-topologies-core-principle -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-core-principle
title: Treat the team as the unit of delivery
summary: "System architecture mirrors organizational communication, so design team boundaries and interactions deliberately, size responsibilities to cognitive load, and align most teams to streams of business change."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: "Choosing team boundaries, charters or interaction rules."
conditions_does_not_apply_when: A purely technical refactor that does not change team ownership.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Most teams map to business-change streams, responsibilities fit cognitive load, and interactions are declared."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat the team as the unit of delivery

Treat the team as the unit of delivery and recognize that system architecture mirrors organizational communication. Design team boundaries and interactions deliberately; size responsibilities to team cognitive load; align most teams to streams of business change; declare team interactions; and treat topology as a living architecture decision aimed at fast flow.
<!-- vpmodule:atom:end team-topologies-core-principle -->
<!-- vpmodule:atom:begin team-topologies-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-diagnostic
title: Run the team-topologies diagnostic
summary: "Check handoff-free stream delivery, team-type fit, declared modes, domain limits, boundary alignment, optional platform adoption, enabling exit criteria and a recurring sensing review, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of an engineering organization.
conditions_does_not_apply_when: A full organizational audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L183-L195"
status: active
revision: 1
---

# Run the team-topologies diagnostic

Use the diagnostic questions and actions to assess whether stream-aligned teams deliver typical changes without handoffs, each team fits one of the four types, dependent team pairs have declared modes, domain counts fit cognitive-load heuristics, service and repository boundaries match team boundaries, platform adoption is optional and measured by load removed, enabling engagements have time limits and exit criteria, and a recurring signal-based topology review exists. When a check fails, realign streams to end-to-end business-change slices; classify, convert, or dissolve misfit teams; declare a mode; reassign domains (at most one complicated domain per team); re-split along fracture planes and give each artifact one owner; run the platform as a product and track voluntary adoption and developer experience; set enabling end dates and capability-transfer goals; and review friction, wait times, and on-call signals quarterly.
<!-- vpmodule:atom:end team-topologies-diagnostic -->
<!-- vpmodule:atom:begin team-topologies-fracture-planes -->
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
<!-- vpmodule:atom:end team-topologies-fracture-planes -->
<!-- vpmodule:atom:begin team-topologies-interaction-modes -->
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
<!-- vpmodule:atom:end team-topologies-interaction-modes -->
<!-- vpmodule:atom:begin team-topologies-inverse-conway -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-inverse-conway
title: Shape teams to produce the target architecture
summary: "Choose the target architecture first, then shape teams and communication paths so it becomes the natural outcome; judge by actual communication, give reorgs architectural review, and let team structure win a conflict."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: "Proposing a reorg, a target architecture or a change to reporting lines."
conditions_does_not_apply_when: A decision that does not change team structure or communication paths.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The target architecture is stated before the team shape, actual communication is examined, and the conflict rule is applied."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L30-L51"
status: active
revision: 1
---

# Shape teams to produce the target architecture

Treat organizational communication and system architecture as structurally linked. Design the target architecture first and shape teams and communication paths so that architecture becomes the natural outcome. Use actual communication patterns rather than the org chart to understand architecture; recognize that unrestricted everyone-to-everyone communication creates coupling and that broad cross-team communication can signal poor boundaries. Anyone shaping teams, reporting lines, or hiring makes architecture decisions, so architects must co-design the organization and reorganization proposals need architectural review. When target architecture conflicts with team structure, team structure prevails.
<!-- vpmodule:atom:end team-topologies-inverse-conway -->