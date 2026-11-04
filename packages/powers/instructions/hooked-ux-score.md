---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-score
title: Score the engagement mechanics
summary: "Score four diagnostic rows at 2/1/0, calculate round(total/8 x 10), and apply the stated manipulation-matrix consequence."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Reviewing or creating engagement mechanics.
conditions_does_not_apply_when: A code review that does not assess engagement.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each row's value and the matrix consequence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L24-L27"
status: active
revision: 1
---

# Score the engagement mechanics

When reviewing or creating product engagement mechanics, score the four Quick Diagnostic rows—internal trigger, dead-simple action, variable reward, and investment loading the next trigger—at 2 when fully satisfied, 1 when partial, and 0 when absent; calculate round(total / 8 × 10). If the Manipulation Matrix classifies the product as Dealer, or any When NOT to Use condition applies, cap the score at 3 regardless of mechanics. Scores 9–10 mean a complete loop with an identified internal trigger and clear ethics; 5–6 mean a working loop that leans on external triggers or predictable rewards; 3 or below means a broken loop or extractive design. Always state the current score and the diagnostic rows preventing 10/10.
