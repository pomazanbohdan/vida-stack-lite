---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-high-output-management-skill-md-7d38e756-c02"
title: "wondelai-skills: skills/high-output-management/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/high-output-management/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/high-output-management/SKILL.md\"}"
atom_ids:
  - high-output-management-score
  - high-output-management-trm
atom_count: 2
atoms: "[{\"atom_id\":\"high-output-management-score\",\"file_sha256\":\"06fbf183b8fbb5f58e3065b0cdf27f2e1c995b57549bfd0cabac2b3b1d81728d\",\"content_sha256\":\"8a2ec45edcc6817c5a97e2b0d2b7457fb1af8bf61d496de00b55d7e106e77f1a\",\"file_bytes\":1851,\"body_bytes\":692},{\"atom_id\":\"high-output-management-trm\",\"file_sha256\":\"92383cd1c83949bc9e228c4f5c1dfdd6404de1954897d1c03ddb762b939eb569\",\"content_sha256\":\"3be19595a4d64b73c31a321b17bda7008cf8f1f612eed13e08d65a1896052546\",\"file_bytes\":2342,\"body_bytes\":1090}]"
carrier_sha256: f37646ed2256901f51f13d433b7c1f3bea23fcdccc0e48741e0d9558e2ede643
carrier_bytes: 4416
revision: 1
status: active
---
<!-- vpmodule:atom:begin high-output-management-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-output-management-score
title: Score management practices
summary: "Rate management practices, calendars and processes 0-10 against the stated principles, report the score and the changes needed for 10, and apply the five bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a manager's calendar, practices or processes."
conditions_does_not_apply_when: A code review that does not assess management.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the band and the specific changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-output-management/SKILL.md; sha256=335edd108bc13a9fdaa994200af901bae97671b3f8a50011c752e3fa94bddbb9; locator=skills/high-output-management/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score management practices

Rate management practices, calendars, and processes from 0 to 10 against the stated principles, state the current score, and identify specific changes needed to reach 10/10. A 9–10 score requires output indicators paired with quality, subordinate-owned TRM-based 1:1s, task-level delegation monitoring, stretch OKRs not driving pay, and a calendar built around forecasted key events. Scores of 7–8, 5–6, 3–4, and 0–2 correspond respectively to the listed remaining process/activity problems, irregular 1:1s and activity indicators, interruption/rank/annual-surprise management, and absence of 1:1s or indicators with firefighting and invisible output.
<!-- vpmodule:atom:end high-output-management-score -->
<!-- vpmodule:atom:begin high-output-management-trm -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-output-management-trm
title: Match management style to task-relevant maturity
summary: "Match style to experience, training and confidence for the specific task: structured instruction at low maturity, mutual reasoning at medium, agreed objectives and light monitoring at high; reassess task by task and make reviews improve performance."
capability_tags:
  - design-managerial-system
pattern_tags:
  - task-relevant-maturity
conditions_applies_when: Choosing a management or review style.
conditions_does_not_apply_when: A uniform style applied regardless of task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The style is justified by the person's TRM for that task, not by seniority."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-output-management/SKILL.md; sha256=335edd108bc13a9fdaa994200af901bae97671b3f8a50011c752e3fa94bddbb9; locator=skills/high-output-management/SKILL.md#L154-L177"
status: active
revision: 1
---

# Match management style to task-relevant maturity

There is no universally good management style. Match it to task-relevant maturity (experience, training and confidence for the specific task): low calls for structured how-to instruction, medium for mutual reasoning about what/why, high for agreed objectives and light monitoring. Reassess task by task, not seniority, and shift style when the task changes. Structure a newly promoted manager's management work even if expert in a prior specialty. A performance review's sole purpose is improving recipient performance and it is the supervisor's most important task-relevant feedback. Complete the written assessment first, then separately choose three messages that will change next year's output. Deliver feedback when events happen; a review surprise is the supervisor's failure. Give a coasting top performer substantial review effort. Once lower needs are met, use an ever-rising self-set bar; training is the manager's highest-leverage way to raise it and should be delivered personally because outsourcing it outsources standards.
<!-- vpmodule:atom:end high-output-management-trm -->