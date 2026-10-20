---
instruction_id: execute-plan-in-order
title: Execute the plan task by task in order
summary: "Execute the plan yourself in this session, prove each step with a test you watched fail and then pass, and stop only for the four named reasons."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "You have an implementation plan with mostly independent tasks, and your human partner chose inline execution or no subagent tool is available."
conditions_does_not_apply_when: "Your human partner chose subagent-driven development, or the plan's tasks are tightly coupled."
artifact_contract_output_type: execution-record
artifact_contract_required_data:
  - plan
  - executed steps
  - verification results
  - stop reason
artifact_contract_verified_by: per-step expected result compared with actual output
compatibility_excludes: []
compatibility_requires:
  - write-implementation-plan
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/implement/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/build.md
status: active
revision: 3
---

# Execute the plan task by task in order
Execute the plan yourself, task by task, in this session: no implementer subagent per task, no reviewer per task.
The plan already did the thinking.
Execute it exactly, prove each step with a test you watched fail and then pass, and leave a record that survives your own forgetting.
Read the plan once, note its context and Global Constraints, and create a todo per task.
If the plan names a Spec, read that too: the spec is the authority the plan argues from, and conflicts inside the plan resolve against it.
The plan's steps are already in RED-GREEN order; follow them in that order.
Run every verification and read every output.
Every step that runs a command has an `Expected:` line.
Run the command, read its output, and compare.
If the code is wrong, use systematic debugging: find the cause; never patch the symptom to make the step's output match.
If the plan is wrong, rule on the smallest change that satisfies the spec, ledger it, and continue.
Commit as the plan's commit steps say.
Do not pause to check in with your human partner between tasks.
Execute all tasks from the plan without stopping.
Four things stop you, and only these: an irreversible or destructive operation; a security-sensitive action; a side effect outside this worktree that norms say you ask about first; and a plan so broken that every path forward is a guess.
For those, stop and ask.
If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.
Call the test-driven loop where possible, at pre-agreed seams. Run typechecking regularly, single test files regularly, and the full test suite once at the end. Once done, run the code review to review the work. Commit your work to the current branch.
Stop and ask the user (do not push through) when:
- a test can't be made to pass or the build breaks without an obvious fix
- the spec is ambiguous, or a task needs a decision the spec doesn't cover
- a task is high-risk or irreversible — auth/permission changes, destructive data migrations, payments, deletions, deploys, anything touching secrets, **or anything you can't undo with `git revert`**
- get explicit sign-off before continuing
Summarize at the end: tasks completed, tests added, commits made, and anything skipped, flagged, or left for the user.
