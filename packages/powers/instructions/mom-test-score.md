---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-score
title: Score the customer conversations
summary: "Score the seven diagnostic rows, report the score, failed rows and fixes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing whether customer conversations produce evidence.
conditions_does_not_apply_when: A narrow sales review that does not assess learning.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, failed rows and fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score the customer conversations

Score seven diagnostic rows, 1 point per passing row; report score, failed rows, and fixes. Bands classify evidence-based conversations, mixed conversations, and pitches with leading questions/no learning.
