---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-business-model-metrics
title: Choose metrics from the business model
summary: "Name the model first, use its archetype-specific metric tree and thresholds, choose one primary model for a hybrid, and define each formula and source up front."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Instrumenting a product or choosing its north-star metrics.
conditions_does_not_apply_when: A pre-revenue prototype with no business model yet.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The model and its metric tree are named, each formula and source is defined, and a hybrid names one primary model."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L80-L103"
status: active
revision: 1
---

# Choose metrics from the business model

Name the business model before selecting its metric tree because model mechanics determine which metrics matter; use archetype-specific measures for e-commerce, SaaS, free mobile apps, media, user-generated content, or two-sided marketplaces. E-commerce includes conversion, average order value, and repurchase; annual repurchase below about 40% indicates acquisition mode and above about 60% loyalty mode, each with a different playbook. SaaS includes MRR, churn, LTV:CAC, expansion, and time-to-value. Free mobile includes downloads, DAU/MAU, paying share, and ARPDAU versus ARPPU, accounting for whale skew. Media uses audience, engaged time rather than raw pageviews, CTR, and RPM. UGC uses the visitor-to-voyeur-to-commenter-to-creator funnel, content per user, and spam rate. Marketplaces use liquidity measures including listings, fill/sell-through, time-to-transaction, take rate, and buyer/seller ratio; GMV alone is vanity until multiplied by take rate. A hybrid business must choose ONE primary model for its OMTM; the secondary model supplies counter-metrics, not equal billing. Define each metric’s formula and source up front. Use model-specific trees and ratios for instrumentation, north-star choices, and reporting.
