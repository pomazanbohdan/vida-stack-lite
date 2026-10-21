---
instruction_id: state-the-failing-direction-of-every-command
title: State the failing direction of every command
summary: "Every runnable command names the observable output that would show it failed, and the statement binds to the nearest preceding command."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A runnable verification command is written.
conditions_does_not_apply_when: The command is a placeholder that is not runnable.
artifact_contract_output_type: failing-direction-statement
artifact_contract_required_data:
  - the command
  - the observable failure signal
artifact_contract_verified_by: every runnable command has a statement that names an observable failure signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 1
---

# State the failing direction of every command
Every runnable `<automated>` command needs a `<fails_when>` sibling naming an observable failure signal:
Within one `<task>`, each `<fails_when>` binds to the nearest **preceding** `<automated>`, and the first statement after a command is the binding one. Two commands need two statements.
