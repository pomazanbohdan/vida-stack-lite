---
instruction_id: require-a-stated-failure-signal-for-every-acceptance-command
title: Require a stated failure signal for every acceptance command
summary: Every runnable acceptance command states what its failure looks like; a command without a failure mode is not an acceptance test.
capability_tags:
  - review-code
pattern_tags:
  - testable-criteria
conditions_applies_when: A plan states acceptance commands.
conditions_does_not_apply_when: The command is a placeholder that is not runnable yet.
artifact_contract_output_type: acceptance-command-check
artifact_contract_required_data:
  - the command
  - its stated failure signal
  - the binding between them
artifact_contract_verified_by: every runnable command carries a failure statement bound to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/failing-direction.md
status: active
revision: 1
---

# Require a stated failure signal for every acceptance command
For each runnable `<automated>` command, does the plan say what output constitutes failure?
A command with no expressible failure mode is not an acceptance test — it reads as rigour and delivers none.
Requiring a stated failing direction is the only shape that catches the silent case, because it forces the plan to name the failure signal rather than assume the command has one.
Within one `<task>`, each `<fails_when>` binds to the nearest **preceding** `<automated>`; a command's binding statement is the **first** one that follows it.
N runnable commands need N statements.
Length is not a signal.
