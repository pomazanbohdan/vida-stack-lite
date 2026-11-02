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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report a denied write, do not work around it
stop and report the denial in your final message — do not work around it by copying or moving the file
with Bash
