---
instruction_id: scan-the-pattern-checklist-before-forming-a-hypothesis
title: Scan the pattern checklist before forming a hypothesis
summary: The known failure patterns for the symptom are checked first; each one is a hypothesis that is verified or eliminated with evidence.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A failure is about to be explained.
conditions_does_not_apply_when: The cause is already known.
artifact_contract_output_type: pattern-scan
artifact_contract_required_data:
  - the categories scanned
  - the pattern that matched
  - the evidence that eliminated or confirmed it
artifact_contract_verified_by: the relevant categories were scanned before the hypothesis was formed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/common-bug-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Scan the pattern checklist before forming a hypothesis
Before forming any hypothesis, scan the relevant categories based on the symptom
Match symptom to pattern
Each checked pattern is a hypothesis candidate — verify or eliminate with evidence
If no pattern matches, proceed to open-ended investigation
Check these FIRST — they cover ~80% of bugs across all technology stacks.
