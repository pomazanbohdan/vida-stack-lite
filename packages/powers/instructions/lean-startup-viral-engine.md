---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-viral-engine
title: Operate a viral growth engine
summary: "Track the viral coefficient, cycle time and referral attribution, and build virality into the product."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A product whose customers bring other customers.
conditions_does_not_apply_when: A product with no sharing or invitation motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The viral coefficient and cycle time are measured, with a target above 1.0."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L161-L164"
status: active
revision: 1
---

# Operate a viral growth engine

Customers bring customers: `viral coefficient = (% who invite) × (invites sent) × (% who join)`; above 1.0 means exponential, self-sustaining growth. Track the coefficient, viral cycle time, and referral attribution. Fits Dropbox, Hotmail, WhatsApp. Strategy: build virality into the product itself.
