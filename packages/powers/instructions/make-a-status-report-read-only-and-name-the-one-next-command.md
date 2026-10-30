---
instruction_id: make-a-status-report-read-only-and-name-the-one-next-command
title: Make a status report read-only and name the one next command
summary: "A status report changes nothing; it says what is installed, what is missing or out of date, and the one command to run next."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: The state of an installation has to be reported.
conditions_does_not_apply_when: The report is meant to change the installation.
artifact_contract_output_type: status-report
artifact_contract_required_data:
  - what is installed
  - what is missing or out of date
  - the one next command
artifact_contract_verified_by: the report changes nothing and ends on exactly one command
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/list-seeds.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make a status report read-only and name the one next command
The status command changes nothing.
It reports what is installed, what is missing or out of date, and the one command to run next.

The listing changes nothing: no listed item is modified.
An empty result is answered with the one command that creates the first item.
The summary states the total and the per-status counts, and the next actions are offered as plain text.
