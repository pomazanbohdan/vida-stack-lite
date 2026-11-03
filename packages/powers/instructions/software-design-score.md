---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-score
title: Score the design against the eight diagnostic rows
summary: "Score the eight diagnostic rows, sanity-check against the bands, and report the score, failed rows and changes needed."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a design against the software-design diagnostic.
conditions_does_not_apply_when: A narrow implementation review that does not assess design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - changes
artifact_contract_verified_by: "The report states the score, failed rows and the changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L18-L28"
status: active
revision: 1
---

# Score the design against the eight diagnostic rows

Score designs by the eight diagnostic rows at approximately 1.25 points each, sanity-check against the stated bands, and report the score, failed rows, and changes needed to reach 10.
