---
instruction_id: report-a-denied-write-do-not-work-around-it
title: "Report a denied write, do not work around it"
summary: A write that a guard denies is reported in the final message; the same effect is not reached by copying or moving the file with a shell command.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A write is refused by a path or permission guard.
conditions_does_not_apply_when: The write was refused because the input was wrong.
artifact_contract_output_type: denial-report
artifact_contract_required_data:
  - the denial
  - the file that was refused
artifact_contract_verified_by: the denial is in the report and no shell copy or move was used to get around it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick.md
status: active
revision: 1
---

# Report a denied write, do not work around it
stop and report the denial in your final message — do not work around it by copying or moving the file
with Bash
