---
instruction_id: write-the-verify-command-so-it-can-distinguish-pass-from-fail
title: Write the verify command so it can distinguish pass from fail
summary: The command that proves a task succeeded can fail; a check that always succeeds is not a check.
capability_tags:
  - write-tests-first
pattern_tags:
  - testable-criteria
conditions_applies_when: A task carries the command that proves it succeeded.
conditions_does_not_apply_when: The command is only there to be read by a person.
artifact_contract_output_type: verify-command
artifact_contract_required_data:
  - the command that runs
  - how pass and fail are told apart
  - what a command that always succeeds would be
artifact_contract_verified_by: the verify command distinguishes pass from fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
status: active
revision: 1
---

# Write the verify command so it can distinguish pass from fail
- A runnable command or check that proves the task succeeded. Must distinguish pass from fail — `echo "done"` is not valid.
