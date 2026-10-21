---
instruction_id: name-the-failure-signal-for-every-acceptance-command
title: Name the failure signal for every acceptance command
summary: Every runnable verification command carries a sibling statement that names the output which constitutes failure; a command with no expressible failure mode is not an acceptance test.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A plan writes a runnable verification command that decides whether a task is done.
conditions_does_not_apply_when: The command is a placeholder for a test another task has to create first.
artifact_contract_output_type: acceptance-command
artifact_contract_required_data:
  - the runnable command
  - the statement of what output constitutes failure
  - the placement of the statement
artifact_contract_verified_by: "every runnable command has a failure statement placed immediately after it, and no statement is bound to the wrong command"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 1
---

# Name the failure signal for every acceptance command
**Every runnable `<automated>` command needs a `<fails_when>` sibling naming what output constitutes failure.** A command with no expressible failure mode is not an acceptance test.
- **One statement per runnable command**, placed immediately after it. Within a task, each `<fails_when>` binds to the nearest preceding `<automated>`, and the first statement after a command is the binding one. Two commands need two statements.
- The `MISSING` sentinel is exempt. It is not a runnable command, so it has no failure mode to state. Do not attach a `<fails_when>` to one.
Prefer the signal the tool actually emits over one you imagine. When `prior_verify_commands` supplies a command a prior phase already proved, the failure signal that command produces is the one to state - you have seen its output. When you author a new command, name the signal from the tool's documented output shape, not from a guess about it.
The authoring test, applied to yourself: *if this command were silently doing nothing, what in its output would tell me?* If you cannot answer, you do not yet have an acceptance command - you have a command. Fix the command, do not invent a statement for it.
