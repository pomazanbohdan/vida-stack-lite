---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-score
title: Score the message against the six traits
summary: "Rate each of the six traits 1-10, map the 6-60 total to a band, and report the score, lowest traits and fixes."
capability_tags:
  - write-technical-prose
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a message for stickiness.
conditions_does_not_apply_when: A narrow grammar review that does not assess memorability.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - lowest-traits
  - improvement-list
artifact_contract_verified_by: "The report states the 6-60 score, its band, the lowest traits and the specific fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L18-L20"
status: active
revision: 1
---

# Score the message

Rate each of the six traits from 1 to 10, sum them to a 6–60 total, and map the total to a band: 50–60 = 9–10, extremely sticky; 35–49 = 7–8, strong; 20–34 = 4–6, forgettable; below 20 = ≤3, will not stick. State the current score, the lowest-scoring traits and the specific fix from the diagnostic.
