---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-cro-methodology-skill-md-0637a608-c02"
title: "wondelai-skills: skills/cro-methodology/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/cro-methodology/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/cro-methodology/SKILL.md\"}"
atom_ids:
  - cro-methodology-process
  - cro-methodology-research
  - cro-methodology-score
atom_count: 3
atoms: "[{\"atom_id\":\"cro-methodology-process\",\"file_sha256\":\"b8e0860518d4e50e155a84458a04c8cc2d16e7b7f3838722101aeaecb2fcec9f\",\"content_sha256\":\"b6e1643e4bc553768c0ae7cdc0fdc93d724395baeced555cdc80a508ef775721\",\"file_bytes\":1663,\"body_bytes\":458},{\"atom_id\":\"cro-methodology-research\",\"file_sha256\":\"c840ed6648df3207218fe54f351776d1777446700b2e8182f044cf9fb82107fe\",\"content_sha256\":\"e7e54621ee567ed0d7bb4418baa4ef6b6b9b39e4e5b65d36e4d7acd30df1ad89\",\"file_bytes\":1910,\"body_bytes\":698},{\"atom_id\":\"cro-methodology-score\",\"file_sha256\":\"5e154f2bb8c351a194515b4d0af6c94d0422fd5cc07dab45c10b6f985e23a823\",\"content_sha256\":\"e8cb8ec3013f629f232fa7342d2313d748b3955de38686c29a24abdebdecc0d6\",\"file_bytes\":1574,\"body_bytes\":376}]"
carrier_sha256: 03cb269c50079ca3cad4d883e0c4b5bf672201342318396750cb255661e04c78
carrier_bytes: 5456
revision: 1
status: active
---
<!-- vpmodule:atom:begin cro-methodology-process -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-process
title: Run the systematic CRO process
summary: "Define success metrics, map the funnel, research visitors and objections, gather market intelligence, prioritize with ICE and bold experiments, run tests at 95% confidence over full business cycles, and scale wins."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Planning a conversion optimization program.
conditions_does_not_apply_when: A single copy tweak with no measurement plan.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The plan names the metric, funnel stage, research, prioritization and test duration before changes ship."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L24-L51"
status: active
revision: 1
---

# Run the systematic CRO process

Use a systematic CRO process: define success metrics aligned with business KPIs before changing pages; map the full funnel to locate underperforming paths and missing stages; research visitor characteristics, UX blockers, and objections; gather market intelligence; prioritize with ICE and design bold experiments; run experiments with at least 95% confidence over full business cycles, then scale wins across the business.
<!-- vpmodule:atom:end cro-methodology-process -->
<!-- vpmodule:atom:begin cro-methodology-research -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-research
title: Research conversion barriers from visitor sources
summary: "Use primary sources for visitor language and secondary sources for industry objections, use analytics for where and qualitative research for why, and protect consent and privacy."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: Gathering conversion research before a test.
conditions_does_not_apply_when: A secondary desk review with no visitor contact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The research states its primary and secondary sources, quotes visitor language, and records consent and anonymization."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L52-L80"
status: active
revision: 1
---

# Research conversion barriers from visitor sources

Research conversion barriers using primary sources such as exit surveys, live chat, support tickets and sales calls, and secondary sources such as reviews, social media and competitors. Use primary sources for direct visitor language and secondary sources for industry-wide objections. Use analytics and heatmaps to locate problems and qualitative surveys or interviews to learn why. Non-converter surveys should ask one question; post-purchase surveys should ask what nearly stopped the purchase. Use customers’ exact language. Anonymize data, obtain consent for recordings, and do not survey so aggressively that the experience is degraded.
<!-- vpmodule:atom:end cro-methodology-research -->
<!-- vpmodule:atom:begin cro-methodology-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-score
title: Score the page against the conversion diagnostic
summary: "Score a page, funnel or flow against the seven diagnostic rows, report the score and failing rows, and apply the stated 9-10, 5-6 and 3-or-below characteristics."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a landing page, funnel or conversion flow."
conditions_does_not_apply_when: A code review that does not assess conversion.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows, and the stated characteristics that apply."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the page against the conversion diagnostic

Score a landing page, funnel, or conversion flow against the seven Quick Diagnostic rows, awarding about 1.4 points for each yes (7 rows total 9.8, capped at 10). Report the current score and failing rows. Interpret 9–10, 5–6 and 3-or-below using the listed characteristics; the source does not define bands 4, 7, or 8.
<!-- vpmodule:atom:end cro-methodology-score -->