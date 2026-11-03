---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-declare-assumptions
title: Declare and rank assumptions
summary: "List assumptions, rank them by risk and uncertainty, test the highest first, and disclose committed direction."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Starting design work under uncertainty.
conditions_does_not_apply_when: A change with no material assumption.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - assumptions
  - ranking
artifact_contract_verified_by: Assumptions are ranked and the highest-risk item is tested first.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L32-L55"
status: active
revision: 1
---

# Declare and rank assumptions

Declare assumptions, rank by risk and uncertainty, test highest-risk/uncertainty first, write collaboratively, and disclose when direction is committed.
