---
instruction_id: name-the-failure-signal-for-every-automated-command
title: Name the failure signal for every automated command
summary: Every runnable verification command carries the sibling statement that names what output counts as failure.
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: A runnable verification command is written into a plan.
conditions_does_not_apply_when: The command is the placeholder that says the test must be created first.
artifact_contract_output_type: failure-direction
artifact_contract_required_data:
  - the command
  - the failure signal statement
  - the observable output it names
artifact_contract_verified_by: every runnable command has its own failure signal naming an observable output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the failure signal for every automated command
**Every runnable `<automated>` command needs a `<fails_when>` sibling naming what output constitutes failure.** A command with no expressible failure mode is not an acceptance test
**The authoring test, applied to yourself:** *if this command were silently doing nothing, what in its output would tell me?* If you cannot answer, you do not yet have an acceptance command — you have a command. Fix the command, do not invent a statement for it
**One statement per runnable command**, placed immediately after it. Within a task, each `<fails_when>` binds to the nearest preceding `<automated>`, and the first statement after a command is the binding one. Two commands need two statements
**Name an observable signal**, not the word "failure". `non-zero exit`, `"0 passed" in the summary`, `the coverage line is absent`, `stderr contains "ECONNREFUSED"` are signals. *"the command fails"*, *"it doesn't work"*, *"an error occurs"* are restatements and will be flagged
**Short is fine.** `non-zero exit` is complete. There is no minimum length and no required keyword
**`TBD`, `TODO`, `N/A`, `none`, `unknown`, `?`, `-` are rejected outright** as whole values. A statement you cannot write is a command you should not ship
Prefer the signal the tool actually emits over one you imagine. When `prior_verify_commands` supplies a command a prior phase already proved, the failure signal that command produces is the one to state — you have seen its output. When you author a new command, name the signal from the tool's documented output shape, not from a guess about it
