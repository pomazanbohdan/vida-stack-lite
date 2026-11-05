---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-score
title: Score the product out of 10
summary: "Count the 7 Quick Diagnostic rows the product passes, map the count with 7/7=10, 6/7=9, 5/7=7, 4/7=6, 3/7=4 and at most 2/7 at most 3, read the 9-10, 5-8 and at most 4 bands, and state the failed rows and fixes."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Scoring a product review.
conditions_does_not_apply_when: A design review with no verdict.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - cuts-and-fixes
artifact_contract_verified_by: "The report states the score, the exact failed rows and the cuts or fixes needed to reach 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the product out of 10

Score the product against a goal of 10/10 by counting how many of the 7 Quick Diagnostic rows it passes, then map the count as follows: 7/7 = 10, 6/7 = 9, 5/7 = 7, 4/7 = 6, 3/7 = 4, and <=2/7 <= 3. The bands are 9-10 = insanely great and ships; 5-8 = real cuts and fixes required; <=4 = not done and back to demos. There is no 'pretty good' verdict: state the score, the exact rows that failed, and the specific cuts or fixes required to reach 10/10.
