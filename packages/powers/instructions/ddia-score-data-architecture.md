---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-score-data-architecture
title: Score a data architecture against the DDIA diagnostic
summary: "Score the seven diagnostic rows, awarding credit only for deliberate documented trade-offs, and report the score, failed rows and improvements."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a data architecture against the seven DDIA diagnostic rows.
conditions_does_not_apply_when: A narrow implementation review that does not assess data-layer choices.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - improvements
artifact_contract_verified_by: "The report states the score, the failed rows and the improvements needed to reach 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score a data architecture against the DDIA diagnostic

Score data architecture against the seven diagnostic rows, awarding credit only when choices have evidence of deliberate documented trade-offs. Report the score, failed rows and improvements using the listed bands.
