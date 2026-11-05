---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-score
title: Score the typography out of 10
summary: "Score one point per satisfied Quick Diagnostic row out of 10, read the 9-10, 5-6 and at most 3 bands, and always state the score and the failing rows."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a web typography implementation.
conditions_does_not_apply_when: A visual review that does not assess reading.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: The report states the score and the specific failing diagnostic rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the typography out of 10

Score a web-typography implementation from 0 to 10 as the number of the 10 Quick Diagnostic rows it satisfies, with a goal of 10/10. Bands: 9-10 means body 16px+, measure under 75ch, line-height 1.4+, clear level contrast, font payload under 200KB, fallbacks set, and survives 200% zoom; 5-6 means readable but missing measure control, fallbacks, or zoom resilience; <=3 means sub-16px body, no measure cap, FOIT, or unreadable hierarchy. Always state the current score and the specific diagnostic rows failing.
