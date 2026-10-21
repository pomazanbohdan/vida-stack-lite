---
instruction_id: restart-the-investigation-when-the-model-explains-nothing
title: Restart the investigation when the model explains nothing
summary: "When the investigation stops explaining the behaviour, it is restarted from the facts that are known and the ones that are ruled out."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "The investigation has produced several fixes that did not work, or cannot explain the behaviour."
conditions_does_not_apply_when: The investigation is still producing evidence.
artifact_contract_output_type: restart-record
artifact_contract_required_data:
  - what is known for certain
  - what was ruled out
  - the new hypotheses
  - the point the investigation restarts from
artifact_contract_verified_by: "the known facts, the ruled-out branches and the new hypotheses are written down before the work resumes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 1
---

# Restart the investigation when the model explains nothing
Consider starting over when:
2+ hours with no progress - You're likely tunnel-visioned
3+ "fixes" that didn't work - Your mental model is wrong
You can't explain the current behavior - Don't add changes on top of confusion
The fix works but you don't know why - This isn't fixed, this is luck
Write down what you know for certain
Write down what you've ruled out
List new hypotheses (different from before)
