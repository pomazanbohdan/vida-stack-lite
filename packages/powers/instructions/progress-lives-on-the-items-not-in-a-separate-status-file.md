---
instruction_id: progress-lives-on-the-items-not-in-a-separate-status-file
title: "Progress lives on the items, not in a separate status file"
summary: "The progress of the work is read from the items themselves, grouped by what can happen next, with what each item blocks and the counts by state."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The state of the work has to be reported.
conditions_does_not_apply_when: The state is being set for the first time.
artifact_contract_output_type: progress-report
artifact_contract_required_data:
  - the items and their state
  - what each item blocks
  - the counts by state
artifact_contract_verified_by: the report comes from the items themselves and not from a separate status file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Progress lives on the items, not in a separate status file
Progress lives on tickets, not in a separate sprint or status file.
`tickets.py next [<folder>]` groups the open tickets by what can happen next; `tickets.py status [<folder>]` reports every ticket with its `status`, `tracker_status`, and `state`, what it blocks, and counts by state.
