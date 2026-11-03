---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-score
title: Score the design against the two gulfs
summary: "Score five diagnostic rows for discoverability, evaluation, recovery, mapping and constraints, and report failing rows."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a user interface against the two-gulf model.
conditions_does_not_apply_when: A narrow visual review that does not assess use.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failing_rows
artifact_contract_verified_by: The report states the score and failing rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the design against the two gulfs

Score 2 points per satisfied diagnostic row (five rows: discoverability, evaluation, error recovery, mapping, constraints). Bands: 9-10 means users act without instructions, understand outcomes, and recover; 5-6 means one gulf or error path is broken; <=3 means users need a manual or routinely blame themselves. Report score and failing rows.
