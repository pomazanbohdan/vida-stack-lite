---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-score
title: Score iOS native idiom and accessibility
summary: "Score six diagnostic rows plus up to four native-idiom points, report the score and the improvements needed to reach 10/10, using only the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an iOS interface.
conditions_does_not_apply_when: A code review that does not assess the interface.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, failed rows and improvements."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score iOS native idiom and accessibility

Scoring rule: goal is 10/10. Award 1 point per satisfied row of the Quick Diagnostic (6 rows), plus up to 4 points for native idiom: +1 for semantic colors/text styles throughout with no hardcoded values, +1 for system controls over custom reimplementations, +1 for standard gestures and meaningful haptics, +1 for SF Symbols and correct app-icon shape. Bands: 9-10 = native, accessible, adapts to Dark Mode and Dynamic Type, zero foreign patterns; 5-6 = works but leaks Android idioms or hardcodes color/size; <=3 = fails safe areas, touch targets, or VoiceOver. Always state the score and the specific improvements needed to reach 10/10.
