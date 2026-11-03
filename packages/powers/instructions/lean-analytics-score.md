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
