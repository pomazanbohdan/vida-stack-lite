---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-score
title: Score the sprint plan and execution
summary: "Score a sprint plan or execution out of 10 against the ten stated items, report the score and the missing items."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a sprint plan or a completed sprint.
conditions_does_not_apply_when: A code review that does not assess the sprint.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - missing-items
artifact_contract_verified_by: The report states the score and each missing item.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L18-L34"
status: active
revision: 1
---

# Score the sprint plan and execution

Score a sprint plan or execution out of 10, awarding one point for each listed item when present and correct; report the score and missing items. The ten items require: a full-week Decider and one Sprint Master; Monday target customer and moment; hard time boxes including Crazy 8s in 8 minutes and 10am-5pm days; solo anonymous sketches without group brainstorming; Wednesday Decider Supervote rather than consensus; storyboard before prototyping; Goldilocks facade testable in 5-15 minutes with trial run; exactly five target users recruited by screener and six scheduled for no-show coverage; Friday Five-Act Interview with unexplained prototype interpretation; and debrief converting the +/-/~ grid to a next-step decision. Cap a plan at 6 if it lacks the Decider, real users, or a same-day prototype.
