---
instruction_id: a-passed-verdict-requires-an-empty-human-verification-list
title: A passed verdict requires an empty human-verification list
summary: The passing verdict is only available when nothing was left for a human; otherwise the verdict is that a human is needed.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A verification decides its overall verdict.
conditions_does_not_apply_when: The run is not a verification of a phase goal.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the verdict
  - the human-verification list that was empty or not
artifact_contract_verified_by: the verdict is passed only when the human-verification list is empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A passed verdict requires an empty human-verification list
**passed is ONLY valid when the human verification section is empty.** If Step 8 produced any items — including any truth left ⚠️ PRESENT_BEHAVIOR_UNVERIFIED — the status is not `passed`: it is `human_needed`, or `gaps_found` when rule 1 also fires (the ordered tree keeps gaps_found's precedence).
Classify status using this decision tree IN ORDER (most restrictive first):
