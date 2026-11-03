---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-score
title: Score the job definition
summary: "Score the seven diagnostic rows plus depth for all three dimensions, product-free wording and non-consumption, and report the rows to fix."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a jobs-to-be-done analysis.
conditions_does_not_apply_when: A narrow feature review that does not assess the job.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: The report states the current score and the specific diagnostic rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L23-L26"
status: active
revision: 1
---

# Score the job definition

Goal: 10/10. Score 1 point per satisfied row in the Quick Diagnostic (7 rows) plus up to 3 points for depth: +1 if all three job dimensions are evidenced, +1 if the job statement avoids any product/solution name, +1 if competition includes non-consumption. Bands: 9-10 = job stated without the product, all four forces mapped, three dimensions evidenced, non-obvious competition and Little Hire tracked; 5-6 = job named but one or two diagnostic rows fail (usually missing forces or emotional/social dimensions); <=3 = product-first framing, demographic segmentation, or Pull-only thinking. Always state the current score and the specific diagnostic rows to fix.
