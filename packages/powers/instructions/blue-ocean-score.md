---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: blue-ocean-score
title: Score the strategy against the five rows
summary: "Map satisfied diagnostic rows to the 0-10 bands and report the score, failed rows and ERRC/Six Paths changes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a blue-ocean strategy.
conditions_does_not_apply_when: A narrow competitor review that does not assess value innovation.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - changes
artifact_contract_verified_by: "The report states the score, failed rows and the ERRC/Six Paths changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/blue-ocean-strategy/SKILL.md; sha256=6fefda23f1673390476244db624ff0fe9c115a445d0a43728d5d5d310a8ae896; locator=skills/blue-ocean-strategy/SKILL.md#L18-L28"
status: active
revision: 1
---

# Score the strategy against the five rows

Score a strategy by how many of the five Quick Diagnostic rows it satisfies, using the source bands: 9–10 for all five rows; 7–8 when one gate is weak (four rows); 5–6 for two or three rows; ≤3 for zero or one row. Report the current score, the failed rows, and the specific ERRC/Six-Paths moves needed to reach 10/10. Do not invent a score for a row count outside these bands.
