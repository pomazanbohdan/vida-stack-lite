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
status: active
revision: 1
---

# Make a status report read-only and name the one next command
The status command changes nothing.
It reports what is installed, what is missing or out of date, and the one command to run next.
