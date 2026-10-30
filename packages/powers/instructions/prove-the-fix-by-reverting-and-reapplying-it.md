---
instruction_id: prove-the-fix-by-reverting-and-reapplying-it
title: Prove the fix by reverting it and reapplying it
summary: The fix is reverted to see the bug return and reapplied to see it disappear; that proves this change is what fixed it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix is about to be accepted.
conditions_does_not_apply_when: "No change was made, only a diagnosis."
artifact_contract_output_type: revert-reconfirm-record
artifact_contract_required_data:
  - the bug that returned on revert
  - the result after reapplying
  - the size of the change
artifact_contract_verified_by: the bug returned on revert and was gone after the fix was reapplied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-fix-acceptance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove the fix by reverting it and reapplying it
Revert-and-reconfirm (Agans Rule 9 — "If you didn't fix it, it ain't fixed") — revert the fix, confirm the bug returns; reapply, confirm it is gone.
Proves *this* change is what fixed it.
Must run **before** a fix is accepted.
Requires a recorded repro (an automated test OR explicit manual steps written in the debug file)
If the diff spans multiple unrelated hunks across files, that itself is a finding — the fix is not minimal; flag it.
