---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-diagnostic
title: Run the 37signals product diagnostic
summary: "Check fixed time, shaped work, team size, refusals, team-discovered tasks, hill charts, cool-down and product opinion, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a product process.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L164-L178"
status: active
revision: 1
---

# Run the 37signals product diagnostic

Diagnose work with these checks and responses: if no fixed time constraint, set a six-week-or-smaller appetite; if it is not rough, solved, and bounded, define problem, appetite, solution, rabbit holes, and no-gos; if a team of 2–3 people cannot do it, break the work into independent six-week bets; if fewer than 5 things have been refused this cycle, cut at the betting table; if the team is not discovering its tasks, hand off a shaped pitch instead of task lists; if progress is not tracked with hill charts, distinguish figuring out from execution; if there is no cooldown, schedule two unstructured weeks between cycles; and if software lacks a clear opinion, choose the best default and remove the setting.
