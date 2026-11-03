---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-score
title: Score the go-to-market against the chasm diagnostic
summary: "Count satisfied diagnostic rows, map to 0-10, and report the score, failing rows and a fix for each."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a technology go-to-market.
conditions_does_not_apply_when: A narrow sales review that does not assess the chasm.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, failing rows and a fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L20-L29"
status: active
revision: 1
---

# Score the go-to-market against the chasm diagnostic

Score a tech go-to-market by counting yes answers across the seven Quick Diagnostic rows and mapping them to 0–10 at roughly 1.4 points per satisfied row. Report the score, failing rows, and a fix for each. The stated bands describe 9–10 as crossed, 5–6 as mid-chasm, and ≤3 as early-market tactics aimed at mainstream.
