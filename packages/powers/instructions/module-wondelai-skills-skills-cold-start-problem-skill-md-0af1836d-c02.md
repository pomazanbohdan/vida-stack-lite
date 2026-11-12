---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-cold-start-problem-skill-md-0af1836d-c02"
title: "wondelai-skills: skills/cold-start-problem/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/cold-start-problem/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/cold-start-problem/SKILL.md\"}"
atom_ids:
  - cold-start-problem-score
  - cold-start-problem-tipping
atom_count: 2
atoms: "[{\"atom_id\":\"cold-start-problem-score\",\"file_sha256\":\"6a5d4744c7458337710334cac586515cf04b275c80a70d3cf4e071a0d770eef6\",\"content_sha256\":\"776cfdf2e86ddcf99c8ddfd0f1d52b8ffebcd9459f57aa8adcb37416d0a95fd5\",\"file_bytes\":1874,\"body_bytes\":759},{\"atom_id\":\"cold-start-problem-tipping\",\"file_sha256\":\"57c78142e7d98b482dbc39f50e917c0925f1fb9b19927d12274100cd505476b4\",\"content_sha256\":\"0ff196ee166852375af34321bd8337f407a7708f7da5fe3a99a66f990b99519c\",\"file_bytes\":2065,\"body_bytes\":946}]"
carrier_sha256: b6e3b23a36b83ba9599520fa0abc968901cd3627ca80e820be27288350652e12
carrier_bytes: 4154
revision: 1
status: active
---
<!-- vpmodule:atom:begin cold-start-problem-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-score
title: Score the networked-product plan
summary: "Score launch plans and growth strategies 0-10 against the framework, report the score and state the changes needed to reach 10."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a networked-product launch or growth plan.
conditions_does_not_apply_when: A code review that does not assess the network.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the networked-product plan

Score networked-product launch plans and growth strategies from 0 to 10 against the framework, report the current score, and state specific changes needed to reach 10. Bands: 9–10 requires a named atomic network, instrumented magic moment, hard side solved first, repeatable tipping playbook, density/liquidity metrics, and explicit ceiling and moat plan; 7–8 has a clear atomic network and hard-side focus but ad hoc tipping or metrics favoring totals over density; 5–6 acknowledges network effects but targets a broad market and treats both sides equally; 3–4 is generic acquisition with only 'add invites and hope'; 0–2 is big-bang launch with vanity signups, no hard-side strategy, and no liquidity measures.
<!-- vpmodule:atom:end cold-start-problem-score -->
<!-- vpmodule:atom:begin cold-start-problem-tipping -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-tipping
title: Tip one network after another
summary: "After the first atomic network works, use a repeatable playbook to tip further networks, each launch cheaper than the last; use invite-only curation and other stated tactics."
capability_tags:
  - design-network-effects
pattern_tags:
  - network-tipping
conditions_applies_when: Expanding from the first network.
conditions_does_not_apply_when: A single-network product with no expansion goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The playbook names its repeatable steps and cost trend.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L103-L127"
status: active
revision: 1
---

# Tip one network after another

After the first atomic network works, use a repeatable playbook to tip further networks, with each launch becoming cheaper. Use invite-only curation, real scarcity and social proof; pay for launch through subsidies, guarantees, or pre-committed supply; and seed influencers or communities. Invite-only should curate early culture, create scarcity buzz, and bring each invitee through a real social connection already inside. Treat subsidies as network acquisition cost: measure spend per active network and taper on a published schedule. Avoid big-bang launches because rapid signups can land in weak, empty networks that do not retain. After tipping, operate acquisition, engagement, and economic effects as named continuous workstreams; reuse awareness, playbooks, and supply relationships to lower subsequent launch costs. Scarcity and exclusivity must be real; fake waitlists and limited spots are deceptive.
<!-- vpmodule:atom:end cold-start-problem-tipping -->