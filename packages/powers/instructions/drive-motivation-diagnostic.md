---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: drive-motivation-diagnostic
title: Run the motivation diagnostic
summary: "Check choice, visible progress, challenge match, purpose, social context and reward type, and apply the matching action for each failed check."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a motivation system.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/drive-motivation/SKILL.md; sha256=f4683c7ab6846f168272a6905cea24ebfa56218c07f1168230f0991ae3eb6c5b; locator=skills/drive-motivation/SKILL.md#L178-L190"
status: active
revision: 1
---

# Run the motivation diagnostic

Audit any motivation system with these six questions and actions for a no answer: can users choose what, when, and how (if no, add choices, flexibility, and customization); can users see progress (if no, add progress tracking and skill levels); is challenge matched to skill (if no, implement adaptive difficulty); is there immediate feedback (if no, add real-time response to actions); does the user know why the system matters (if no, connect to mission and show impact); are if-then rewards used (if no, switch to now-that rewards or intrinsic design).
