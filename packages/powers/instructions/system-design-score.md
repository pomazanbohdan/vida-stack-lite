---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-score
title: Score the design against the system-design diagnostic
summary: "Score the eight diagnostic rows, state the current score and failing rows, and give a specific fix for each."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a system design against the eight diagnostic rows.
conditions_does_not_apply_when: A narrow code review that does not assess system design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, the failing rows and a specific fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the design against the system-design diagnostic

Score a design against the eight Quick Diagnostic rows using round(passed / 8 × 10); the source defines score bands by completeness of requirements, estimates, redundancy, database and cache strategy, queues, monitoring, and deployment. State the current score, failing rows, and a specific fix for each.
