---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-score
title: Score the 8-row microinteraction diagnostic
summary: "Score a microinteraction by counting the Quick Diagnostic rows it passes, compute round(passed / 8 x 10), read the stated band, and report the score, failed rows and a specific fix for each."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a microinteraction.
conditions_does_not_apply_when: A code review that does not assess the interaction.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - specific-fixes
artifact_contract_verified_by: "The report states the score, failed rows and a specific fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score the 8-row microinteraction diagnostic

Score a microinteraction against the 8 Quick Diagnostic rows with the stated goal of 10/10: count how many rows it passes and compute score = round(passed / 8 × 10), then read the stated band. The bands are 9-10 for passing all 8 rows, described as a deliberate discoverable trigger with visible states, simple predictable rules, sub-100ms feedback scaled to event significance, evolution over time, mode-free or mode-visible behavior, and learnability without help; 5-6 for 4-5 rows passing, meaning it works but has a generic feel; and <=3 for 2 or fewer rows passing, meaning missing feedback, invisible triggers, or hidden modes that break trust. Always state the current score, which diagnostic rows failed, and the specific fix for each.
