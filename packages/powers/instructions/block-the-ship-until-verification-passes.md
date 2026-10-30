---
instruction_id: block-the-ship-until-verification-passes
title: Block the ship until verification passes
summary: "A release reads the verification status through its owner; only a passed status lets the work ship, and a failed read is a hard error, never an empty result."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A finished piece of work is about to be released and a verification report exists for it.
conditions_does_not_apply_when: There is no verification report to read.
artifact_contract_output_type: ship-gate-decision
artifact_contract_required_data:
  - the verification status
  - the next action when the gate blocks
  - the command to run next
artifact_contract_verified_by: the release proceeds only on a passed verification status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Block the ship until verification passes
Only `passed` may ship.
If `$STATUS` is `passed`, verification is complete — continue to the next preflight check; do not read any further verification field.
A non-zero exit above is a hard error (a report `status` outside `passed | gaps_found | human_needed`): present the error and stop.
Any other value (including `gaps_found`, `human_needed`, `stale`, `missing`, and `phase_dir_not_found`) blocks with `PHASE_VERIFICATION_INCOMPLETE`.
Present `$NEXT_ACTION` to the user and, when `$NEXT_COMMAND` is non-empty, show it as the command to run next.
These two are message text only — the block/allow decision has already been made from `$STATUS`, so a concurrent write between the reads cannot change the gate's verdict.
