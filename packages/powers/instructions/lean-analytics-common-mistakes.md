---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-common-mistakes
title: Avoid the listed analytics mistakes
summary: "Avoid dashboard sprawl, cumulative charts, copied north stars, skipped cohorts, premature virality, easy metrics, missing targets and correlation-as-causation, and apply each fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a metric set or dashboard for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L152-L164"
status: active
revision: 1
---

# Avoid the listed analytics mistakes

Avoid these failure patterns and apply the paired fix: a 40-metric dashboard diffuses ownership, so show one large OMTM and 4–6 supporting metrics and archive the rest; cumulative charts hide decay, so plot rates, conversions, and cohort retention; copying another company's north star ignores model differences, so derive OMTM from model and stage; skipping cohorts hides product change, so track each signup cohort over time; optimizing virality before stickiness multiplies churn, so pass retention before invite loops; measuring what is easy rather than risky leaves gut-driven decisions, so instrument the riskiest assumption first; omitting a line in the sand enables rationalization, so pre-commit target, date, and miss response; confusing correlation with causation risks optimizing a non-driver, so run a controlled experiment before investing.
