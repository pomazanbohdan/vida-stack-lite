---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-sticky-engine
title: Operate a sticky growth engine
summary: "Track churn, retention cohorts and DAU/MAU so natural growth exceeds churn."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "A subscription, social or SaaS product using retention-led growth."
conditions_does_not_apply_when: A one-off purchase with no retention motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The engine measures churn and retention and states when natural growth exceeds churn.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L157-L160"
status: active
revision: 1
---

# Operate a sticky growth engine

Retention-driven: `growth rate = new customer acquisition rate − churn rate`. Track churn rate, retention cohorts (30/60/90 days), and DAU/MAU. Fits SaaS, subscriptions, social networks. Strategy: improve the product until natural growth exceeds churn.
