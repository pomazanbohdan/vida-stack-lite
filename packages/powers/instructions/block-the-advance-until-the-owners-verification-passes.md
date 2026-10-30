---
instruction_id: block-the-advance-until-the-owners-verification-passes
title: "Block the advance until the owner's verification passes"
summary: "The work is not closed while the verification that owns the decision still reports a blocker; the blockers and the owner's next command are shown."
capability_tags:
  - verify-work-results
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The checks passed but the verification that owns the closing decision has not.
conditions_does_not_apply_when: The owning verification passed.
artifact_contract_output_type: advance-block
artifact_contract_required_data:
  - the blockers
  - "the owner's next command"
  - the route to resume
artifact_contract_verified_by: "the advance stopped with the blockers and the owner's command shown"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Block the advance until the owner's verification passes
If `PHASE_COMPLETE_PASSED` is not `true`, stop before phase advancement and present:
All UAT tests passed, but phase advancement is blocked until canonical verification passes.
Blocking completion:
`$NEXT_COMMAND` — the verification owner's next command (when non-empty)
resume UAT if blockers remain
