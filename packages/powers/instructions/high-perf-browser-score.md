---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-score
title: Score web performance
summary: "Score the eight diagnostic rows, report the score, failed rows and fixes, and use the 9-10, 5-6 and 3-or-less bands weighted by field metrics."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a web page or frontend application.
conditions_does_not_apply_when: A code review that does not assess performance.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, failed rows and per-row fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score web performance

Score optimization work out of 10 based on how many of the eight Quick Diagnostic rows pass, weighted toward the field metrics: 9-10 requires all eight rows to pass (the four field-metric rows in the green plus content-hashed and cached static assets, HTTP/2+, minimized render-blocking resources, and compression); 5-6 means the four field-metric rows pass but one or more transport/caching/compression rows fail; <=3 means any field-metric row is in the red. Always report the score, which diagnostic rows failed, and the specific fix for each.
