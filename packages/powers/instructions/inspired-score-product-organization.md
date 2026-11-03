---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-score-product-organization
title: Score the product organization
summary: "Score the seven diagnostic rows, report the current score and the failed rows to fix for 7/7."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Assessing team structure, discovery practice or delivery process."
conditions_does_not_apply_when: A narrow delivery review that does not assess product organization.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: The report states the current score and the specific failed rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the product organization

Goal: 7/7. Score product team structures, discovery practices, or delivery processes by the Quick Diagnostic below -- 1 point per satisfied row, scored 0-7. Bands: 6-7 = empowered teams own outcomes and discovery runs continuously with engineers; 4-5 = discovery happens but inconsistently, or teams own output with partial outcome accountability; <=3 = a feature factory: teams receive a roadmap of dated features and skip discovery. Always state the current score and the specific failed diagnostic rows to fix to reach 7/7.
