---
instruction_id: keep-the-sampling-continuous-no-three-tasks-without-a-check
title: Keep the sampling continuous — no three tasks without a check
summary: "No three consecutive tasks may pass without an automated check, and no watch-mode flag may sit in a verify command."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: The per-task verification map of a piece of work is written.
conditions_does_not_apply_when: The work has one task only.
artifact_contract_output_type: sampling-continuity
artifact_contract_required_data:
  - the tasks and the check that covers each of them
artifact_contract_verified_by: no three consecutive tasks lack an automated check and no watch-mode flag is used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/VALIDATION.md
status: active
revision: 1
---

# Keep the sampling continuous — no three tasks without a check
Sampling continuity: no 3 consecutive tasks without automated verify
No watch-mode flags
