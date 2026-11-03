---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: continuous-discovery-prioritize-opportunities
title: Compare opportunities against each other
summary: "Rank opportunities together using opportunity size, market, company and customer factors rather than scoring them in isolation."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Choosing which customer opportunity to pursue next.
conditions_does_not_apply_when: A single opportunity with no competing alternatives.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - ranking
artifact_contract_verified_by: The ranking compares opportunities on explicit factors and identifies the highest-leverage bet.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/continuous-discovery/SKILL.md; sha256=44260b572a050417ba3733021eaa1694318fda80794c3e07800c66b4bc4a0c9e; locator=skills/continuous-discovery/SKILL.md#L122-L144"
status: active
revision: 1
---

# Compare opportunities against each other

Compare opportunities against each other — not in isolation — using opportunity size, market, company, and customer factors to find the highest-leverage bets.
