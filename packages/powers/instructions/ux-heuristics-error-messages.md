---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-error-messages
title: Write actionable error messages
summary: "State what happened, why and how to fix it, in plain specific language that does not blame users and preserves input."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Writing or reviewing error messages.
conditions_does_not_apply_when: A system log message that users never see.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The message explains the cause and the fix and preserves the user's input."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L143-L145"
status: active
revision: 1
---

# Write actionable error messages

Error messages should state what happened, why, and how to fix it; use plain, specific language, do not blame users, and preserve their input.
