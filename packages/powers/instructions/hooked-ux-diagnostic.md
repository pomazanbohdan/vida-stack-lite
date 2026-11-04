---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-diagnostic
title: Run the Hook Model diagnostic
summary: "Check the internal trigger, dead-simple action, variable reward and investment that loads the next trigger, and apply the matching action for each failure."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a feature.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L220-L230"
status: active
revision: 1
---

# Run the Hook Model diagnostic

For any product feature, diagnose whether it has an internal trigger, a dead-simple action, a variable reward, and an investment that loads the next trigger. If the internal trigger is missing, research user emotions; if the action is not simple, remove friction; if the reward is not variable, add unpredictability; if investment does not load the next trigger, connect investment to triggers.
