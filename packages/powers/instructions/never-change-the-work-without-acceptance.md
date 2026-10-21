---
instruction_id: never-change-the-work-without-acceptance
title: Never change the work without acceptance
summary: The proposed changes are shown and the work is left alone until the user accepts; a rejection drops the proposal entirely.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A refinement has proposed changes to a piece of work.
conditions_does_not_apply_when: The caller has already authorised the change.
artifact_contract_output_type: accepted-proposal
artifact_contract_required_data:
  - what the method revealed
  - the proposed changes
  - the decision of the user
artifact_contract_verified_by: the work only changes after an acceptance and a rejection removes the proposal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 2
---

# Never change the work without acceptance
Show what the method revealed and the changes it proposes, then HALT and give the user a choice:
Apply — accept the proposed changes.
Reject — drop the proposal entirely.
Never change the work unless the user accepts the proposal.
If they reject it, drop the proposal entirely.
Any other reply is instruction to follow.

Refuse to convert a unit that is already under way or finished: the change would invalidate the plans and summaries that already exist, and it needs an explicit override.
