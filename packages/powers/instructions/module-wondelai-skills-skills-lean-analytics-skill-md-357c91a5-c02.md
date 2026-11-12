---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-analytics-skill-md-357c91a5-c02"
title: "wondelai-skills: skills/lean-analytics/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/lean-analytics/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-analytics/SKILL.md\"}"
atom_ids:
  - lean-analytics-score
  - lean-analytics-stage-gates
atom_count: 2
atoms: "[{\"atom_id\":\"lean-analytics-score\",\"file_sha256\":\"25802fd96858761d75707fa2daf93e6abecca5f808eece382bbe0278a306b16a\",\"content_sha256\":\"3667e3934276a302990c2a13e8ba7aea899cc731fcac25b4d66331d2eb1554bb\",\"file_bytes\":2046,\"body_bytes\":836},{\"atom_id\":\"lean-analytics-stage-gates\",\"file_sha256\":\"0b5bd96d6fe0e21faea7cec1de1971b7162059de18d0c59ba68a0cab0c69250c\",\"content_sha256\":\"290015b0187d31009f10cf3e1eafe31ab306c2dc524ed36fc35d7c111749ac01\",\"file_bytes\":2380,\"body_bytes\":1164}]"
carrier_sha256: 604706079848728978287804ea15a72b4b55f9052c8b3cf582204fb2b89039c3
carrier_bytes: 4633
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-analytics-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-score
title: Score metrics and instrumentation against the rubric
summary: "Rate metric choices, dashboards and instrumentation plans 0-10, report the score and the changes needed for 10, and apply the five stated bands."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a metric choice, dashboard or instrumentation plan."
conditions_does_not_apply_when: A code review that does not assess metrics.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - improvement-changes
artifact_contract_verified_by: "The report states the current score, the band it falls in, and the specific changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score metrics and instrumentation against the rubric

Score metric choices, dashboards, and instrumentation plans from 0 to 10 against the stated principles; report the current score and specific changes needed to reach 10/10. A 9–10 requires one model- and stage-matched OMTM, a paired counter-metric, a target/date/pre-committed miss response, and cohorted and segmented data. A 7–8 means mostly actionable ratios and a plausible OMTM but lacks an explicit target, has weak cohorting, or has too many key metrics. A 5–6 mixes actionable and vanity metrics, has a dashboard that rarely changes decisions, or does not name model and stage. A 3–4 is dominated by totals, cumulative charts, blended averages, or copied metrics. A 0–2 has no instrumentation or chooses numbers to impress investors rather than drive decisions.
<!-- vpmodule:atom:end lean-analytics-score -->
<!-- vpmodule:atom:begin lean-analytics-stage-gates -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-stage-gates
title: Sequence work through the five startup stages
summary: "Place the startup in Empathy, Stickiness, Virality, Revenue or Scale, choose the OMTM from model and stage, and do not work on a later stage before passing the current gate."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "Deciding whether to spend on growth, change the roadmap or raise."
conditions_does_not_apply_when: An established business that has left the startup stages.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The current stage and its gate evidence are stated, and the work targets the first unpassed gate."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L104-L127"
status: active
revision: 1
---

# Sequence work through the five startup stages

Place the startup in one of five stages—Empathy, Stickiness, Virality, Revenue, or Scale—and use the OMTM at the intersection of business model and current stage. Do not work on a later-stage metric before passing the current gate. Empathy asks whether at least 15 problem interviews reveal a painful, frequent problem people will pay to fix; conversation notes are appropriate. Stickiness measures repeated independent use through retention cohorts and core-action engagement. Virality tracks both coefficient and cycle time; shortening cycle time can grow faster than raising coefficient, and inherent virality beats incentivized invites. Revenue examines revenue per customer, CAC payback, and gross margin to determine whether a dollar returned exceeds a dollar spent soon enough. Scale shifts to channels, partners, new markets, ecosystem, and operations. Gates depend on evidence rather than elapsed time: a flattening retention curve exits Stickiness, and positive unit economics within payback tolerance exits Revenue. Apply the current gate to growth spend, roadmap priorities, and fundraising claims.
<!-- vpmodule:atom:end lean-analytics-stage-gates -->