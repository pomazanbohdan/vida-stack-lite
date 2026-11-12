---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-executing-plans-skill-md-95d9eedf-c01"
title: "superpowers: skills/executing-plans/SKILL.md module"
summary: "Carrier for 5 atomic instructions from superpowers:skills/executing-plans/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/executing-plans/SKILL.md\"}"
atom_ids:
  - enforce-plan-completion-contract
  - execute-plan-in-order
  - record-execution-rulings
  - resume-plan-from-record
  - run-final-change-review
atom_count: 5
atoms: "[{\"atom_id\":\"enforce-plan-completion-contract\",\"file_sha256\":\"526890c58367b756c9545ca4c6bebebbd735212cfaba1737fc0be58baa9b42d6\",\"content_sha256\":\"6395623cda19d971b1c8d3d0dae8e3ea887231b5ed44b053fb7dc16ce7df93d4\",\"file_bytes\":2251,\"body_bytes\":1170},{\"atom_id\":\"execute-plan-in-order\",\"file_sha256\":\"b52445120ace219159d3f596323f9e75d8a6fcb8c45ffa0eb0bc793b885b8a0e\",\"content_sha256\":\"cd9d47b45427f66727c5189282d7a103e2730c242a0f6c57a07d11a50f9f2ad4\",\"file_bytes\":3399,\"body_bytes\":1929},{\"atom_id\":\"record-execution-rulings\",\"file_sha256\":\"825768c61821c2cd7064dad3e3f1e49e778917d8d8f84dd57ef424be196df5ad\",\"content_sha256\":\"54f32e064da616c5cb4fc10fdc290176e82d60778ca367f905dc204263c50e33\",\"file_bytes\":2393,\"body_bytes\":1365},{\"atom_id\":\"resume-plan-from-record\",\"file_sha256\":\"bb445fd626ba91b6d46d593cb891a00ac33fd03b8a97cd6fe4886986a6e429cb\",\"content_sha256\":\"c0b97530b521f3e93286c9644adce4a924ee08933737dd0992c6b8fec671701e\",\"file_bytes\":3519,\"body_bytes\":2032},{\"atom_id\":\"run-final-change-review\",\"file_sha256\":\"fbddcc2ee85f9fc1766f3b2bddd256ba8e5f7c1ff1f5c0766a78f84b3d7f557b\",\"content_sha256\":\"e2b35c0786ab3849919376d5c0ac550ca14807819dcdaecc38d7ca51e4b89a5a\",\"file_bytes\":2568,\"body_bytes\":1424}]"
carrier_sha256: 8feb6ecc0b8beea09c5e5a81d9153818e2833698904ba981ff584badce361b11
carrier_bytes: 14665
revision: 1
status: active
---
<!-- vpmodule:atom:begin enforce-plan-completion-contract -->
---
instruction_id: enforce-plan-completion-contract
title: Complete a task only when the contract is met
summary: "Before a task's ledger line, every named test must have run, its output must be read, and every expected result must have been compared."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You are about to record a plan task as complete.
conditions_does_not_apply_when: "The task is still running, or it has no defined completion evidence."
artifact_contract_output_type: task-completion-evidence
artifact_contract_required_data:
  - full task test run
  - output
  - expected comparison
artifact_contract_verified_by: the full task test run passes and its output was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/executing-plans/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Complete a task only when the contract is met
Before a task's ledger line, all of the following are true, with evidence in this session — not inferred from the diff looking right.
Every test the brief names exists and ran in this task, and you read the output.
The final test run for the task passed.
Every `Expected:` line in the brief was compared against real output.
Every deviation from the brief has a `Ruling:` line in the ledger.
If any item is missing, the task is not complete: finish it.
A failing run records nothing; the task is not complete.
Run the test command the brief names for the whole task.
It runs the tests, keeps the full output in the workspace, prints the tail, and — only if they pass — appends the completion line to the ledger.
Verification before completion governs the claim.
Never move to the next task while the review has open Critical/Important issues that are neither fixed nor parked-with-ruling at the cap.
Watching it fail is a step, not a formality.
A test that passes before the implementation exists is a finding about the test.
Mark the todo complete and take the next task only after the completion line is recorded.
<!-- vpmodule:atom:end enforce-plan-completion-contract -->
<!-- vpmodule:atom:begin execute-plan-in-order -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/executing-plans/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/implement/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/build.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
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
Summarize at the end: tasks completed, tests added, commits made, and anything skipped, flagged, or left for the user.
<!-- vpmodule:atom:end execute-plan-in-order -->
<!-- vpmodule:atom:begin record-execution-rulings -->
---
instruction_id: record-execution-rulings
title: Record every ruling in the ledger
summary: "Decide conflicts, ambiguities, and plan defects as they arise, and write each decision with its reason and its cost if wrong."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "Executing the plan surfaces a choice, a conflict, or a deviation."
conditions_does_not_apply_when: The plan runs with no deviation or ambiguity.
artifact_contract_output_type: execution-ruling
artifact_contract_required_data:
  - decision
  - reason
  - cost if wrong
  - plan location
artifact_contract_verified_by: every deviation has a matching ledger entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/executing-plans/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Record every ruling in the ledger
Conflicts, ambiguities, plan defects — decide them.
The spec is the binding authority, the plan is its argument, and your judgment settles what neither answers.
Record every decision in the ledger as `Ruling: <what you decided> — <why> — <what it costs if wrong>`, and keep going.
Deviating from the plan without a ledgered ruling is a decision made in secret.
Rule on each conflict a row surfaces with the spec as the binding authority, and record the ruling beside its row.
A plan with no reachable spec gets a ledger note saying so — rulings made without one are provisional.
The ruling is carried, not remembered: later tasks that touch the same interface read it from the ledger.
A wrong ruling costs rework your human partner can see and undo; a session parked on a question costs their whole day and buys nothing.
Before you delete anything, collect every ledger line containing `Ruling:` into your final message under "Rulings I made", in the order you made them, each with what it costs if wrong, and every `minor (deferred)` line under "Deferred minors".
Both lists are exhaustive.
Rulings, not stalls.
Final: Ruling: <finding> — <why the code stands> — <cost if wrong>.
A ruling is a decision about a conflict, not a note that you declined a polish suggestion.
Keep the ledger with the task it belongs to.
<!-- vpmodule:atom:end record-execution-rulings -->
<!-- vpmodule:atom:begin resume-plan-from-record -->
---
instruction_id: resume-plan-from-record
title: "Resume from the ledger, not from memory"
summary: "After a break or a compaction, find the plan's own ledger, trust it over recollection, and continue at the first task without a completion line."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "Execution was interrupted, the context was compacted, or the work changed hands."
conditions_does_not_apply_when: The work continues without interruption and with full context.
artifact_contract_output_type: resumed-execution
artifact_contract_required_data:
  - ledger
  - first incomplete task
  - resume reason
artifact_contract_verified_by: completed tasks match ledger entries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/executing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/resume.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Resume from the ledger, not from memory
Conversation memory does not survive compaction.
If its first line names your plan file, tasks with a `Task <N>: complete` line are DONE — do not redo them; resume at the first task without one.
A task whose last line is a fix round is mid-loop: resume the loop at the next round.
A ledger whose first line names a different plan file — or a stray ledger at the old flat path — is another plan's progress: leave it in place and start your own, fresh.
An inline executor that loses its place re-implements tasks whose commits already exist.
The same failure as a controller re-dispatching them, paid for in your own context.
Their commits exist in git even when your context no longer remembers making them.
After compaction, trust the ledger and `git log` over your own recollection.
The ledger is your recovery map.
Track progress in a ledger file, not only in todos.
Harness todos are a live view; the ledger is the record.
`git clean -fdx` will destroy the workspace; if that happens, recover from `git log`.
Another plan's directory is never yours to read or write.
The workspace and ledger are shared with subagent-driven development — same directory, same format — so a plan can change executors mid-flight and the new one resumes from the same ledger.

The `status` field of the plan decides where a resumed run picks up: `draft` → planning (resume planning from the draft); `ready-for-dev` and `in-progress` → implementation; `in-review` and `built` → review.

For `done`, ingest as context — do not resume.

For `blocked`, show its `blocked_reason` and HALT.

For `dropped`, say the work was dropped and HALT.
Read the record in full — the one time you read it.
Frontmatter restores topic, goal, status, and mode: reload that mode's frame and hold it again.
Reconstruct the picture, then reflect back where things stand to re-establish shared state before continuing.
A rerun resumes from the last committed unit and skips the ones that were already committed.
<!-- vpmodule:atom:end resume-plan-from-record -->
<!-- vpmodule:atom:begin run-final-change-review -->
---
instruction_id: run-final-change-review
title: Run one final review of the whole change
summary: "Review the whole branch from its merge base on a fresh context, then fix Critical and Important findings in one TDD pass and defer the minors."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Every task in the plan is finished and the change is ready for a whole-branch review.
conditions_does_not_apply_when: "A task is still running, or the change already passed a final review."
artifact_contract_output_type: final-change-review
artifact_contract_required_data:
  - merge base
  - findings list
  - fix records
  - residual findings
artifact_contract_verified_by: "one whole-branch review, a RED then GREEN record per fix, and a green full suite"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/executing-plans/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run one final review of the whole change
Run the review package for the merge base and head, and review from the file it prints.
With a subagent tool, dispatch the reviewer on the most capable available model — the whole-branch review is a judgment task.
This is the one fresh context the whole run buys. Do not skip it, and do not replace it with your own read of the diff.
Without a subagent tool, perform that review yourself against the package, as a separate pass after the last task's ledger line.
Sort the findings before you act on any of them. The reviewer's severity labels are advice; the gate is yours.
Re-grade first, by effect: a finding's grade is what a reasonable person using this software gets if it ships.
Critical and Important enter the fix pass.
Fix the Critical and Important findings yourself in ONE pass.
Each fix is verified by TDD: write the test that reproduces the finding, watch it fail, make it pass, then run the whole suite.
A fix without a test that failed first is not verified; a suite that is not green after the pass means the pass is not over.
Do not dispatch a re-review: it would re-read a diff whose covering tests already answer "addressed".
Minor goes to the ledger as `Final: minor (deferred): <one-liner>`.
Minor findings never enter the fix pass.
There is no second fix pass.
A finding you decide not to fix is a ruling and reaches your human partner in the rulings list.
<!-- vpmodule:atom:end run-final-change-review -->