---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-diagnostic
title: Run the Lean Analytics diagnostic
summary: "Check the OMTM, decision value, ratio form, model and stage, target, cohorting and counter-metric, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a metric set or dashboard.
conditions_does_not_apply_when: A full analytics audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L165-L177"
status: active
revision: 1
---

# Run the Lean Analytics diagnostic

Use the diagnostic questions to check whether the team can name its current OMTM; whether the metric changes the next action; whether it is a ratio or rate rather than a total; whether business archetype and stage are known; whether a target, date, and miss plan exist; whether data is cohorted and segmented; and whether a counter-metric guards OMTM. For each “No,” follow the stated action: select one metric from current model and stage, drop a non-decision metric or define its gating decision, rewrite totals as conversion/retention/per-user rates, name one of the six archetypes and use its metrics, find the first unpassed gate, write the line in the sand, build cohort tables and split by channel and segment, and pair a counter-metric such as signup growth with 30-day retention.
