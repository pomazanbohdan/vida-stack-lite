---
instruction_id: do-not-auto-advance-without-the-flag
title: Do not auto-advance without the flag
summary: The next phase is entered on its own only when the auto flag or the auto mode is set and the verification passed with no gaps; otherwise the run stops and the options are put to the user.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A phase is verified and the next step would move on to the following one.
conditions_does_not_apply_when: The auto flag is set and the verification passed with no gaps.
artifact_contract_output_type: advance-decision
artifact_contract_required_data:
  - the auto flag or the auto mode
  - the verification result
  - the options put to the user
artifact_contract_verified_by: the run stopped with the options presented unless the auto mode was set and the verification was clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not auto-advance without the flag
**If neither the auto flag nor the auto mode is true:**
**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**
