---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-subagent-driven-development-skill-md-68f88bd6-c01"
title: "superpowers: skills/subagent-driven-development/SKILL.md module"
summary: "Carrier for 5 atomic instructions from superpowers:skills/subagent-driven-development/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/subagent-driven-development/SKILL.md\"}"
atom_ids:
  - delegate-subagent-work
  - maintain-plan-ledger
  - review-task-both-verdicts
  - select-model-per-task
  - wait-boundedly-for-workers
atom_count: 5
atoms: "[{\"atom_id\":\"delegate-subagent-work\",\"file_sha256\":\"7b89d11fbc2379f0b20133fa7c41d899d8a8001b2d7821063591bbe9071e8ffa\",\"content_sha256\":\"5860dd1d1713843cdc40febfd1e7e09bda7f72b1c43647a2192b69e13f41044e\",\"file_bytes\":5484,\"body_bytes\":3499},{\"atom_id\":\"maintain-plan-ledger\",\"file_sha256\":\"f413a996a256bbf9d18c7ac48e46619638420e15097010a187d422bfc06679b4\",\"content_sha256\":\"1ce548c2cbe4497365c113dd3b963a1effa20d233adfc6ef2235b7458faa33d4\",\"file_bytes\":3220,\"body_bytes\":1868},{\"atom_id\":\"review-task-both-verdicts\",\"file_sha256\":\"733215d830a9021be86a2191f5d9352a8a162bd1472805295fdee06cef3c3e28\",\"content_sha256\":\"09358f3e78b0bb8ea6b9505cfe7aed580e52213e288fb1cf42a0e30d277155a8\",\"file_bytes\":3025,\"body_bytes\":1713},{\"atom_id\":\"select-model-per-task\",\"file_sha256\":\"a44f4810a1ce3cff5c83367d8a959c2503651eee42b17f1748cbee5ca4aec6a6\",\"content_sha256\":\"de9dc53ab3f38f1466cf48fabb49292bed64d4317bdcf31338cc177e2fa3d802\",\"file_bytes\":3180,\"body_bytes\":1853},{\"atom_id\":\"wait-boundedly-for-workers\",\"file_sha256\":\"ac30e0230a0258a919c6c56db15f89c06e2e981b7465bd05347d222c7b8ec026\",\"content_sha256\":\"e583384df555263f1234a9da52ba272e885b47a14d0324a4ae8838d3a204fd59\",\"file_bytes\":3082,\"body_bytes\":1415}]"
carrier_sha256: d0b231483723a6d28c970576708e9e2225ddfa7d08935b64583e307ebcbe1d20
carrier_bytes: 18508
revision: 1
status: active
---
<!-- vpmodule:atom:begin delegate-subagent-work -->
---
instruction_id: delegate-subagent-work
title: Delegate subagent work
summary: "Give an independent task to a fresh executor with a complete brief and review its result; when no executor exists, do the task inline with the same gates."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "An independent task can go to a separate executor, or you have to do it yourself."
conditions_does_not_apply_when: The task cannot be separated from the current work and has no result of its own.
artifact_contract_output_type: delegated-task
artifact_contract_required_data:
  - brief
  - task bounds
  - executor report
  - verified result
artifact_contract_verified_by: task-scoped implementation review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/map-codebase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/validate-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 9
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Delegate subagent work
Execute a plan by dispatching a fresh implementer per task, a task review after each, and a broad whole-branch review at the end.
Delegate tasks to agents with isolated context. Do not let them inherit your session context or history. Construct exactly what they need, and preserve your own context for coordination.
Fresh agent per task, task review for specification and quality, broad final review.
Do not pause to check in between tasks. Execute all tasks without stopping. Only an irreversible or destructive operation, a security-sensitive action, a side effect outside the worktree that norms say to ask about, or a plan so broken that every path forward is a guess stops the run.
Conflicts, ambiguities, and plan defects are yours to decide. The specification is the binding authority, the plan is its argument, and your judgment settles what neither answers.
Record every decision with what you decided, why, and what it costs if wrong, then keep going.
Track progress in a ledger file, not only in memory. Conversation memory does not survive compaction, and a controller that lost its place has re-dispatched entire completed task sequences.
Use the least powerful model that can handle each role. Mechanical implementation with a complete specification takes a fast, cheap model. Integration and judgment take a standard model. Architecture, design, and the final review take the most capable available model.
Specify the model explicitly when dispatching. An omitted model inherits the session's model, often the most capable and most expensive.
Turn count beats token price. A cheaper model that takes two or three times the turns costs more overall.
Batch small same-shape work into one dispatch. Reserve one dispatch per task for work that needs its own judgment, tests, or review surface.
Wait in bounded stretches, and reconcile live children between them, so a stuck or lost child is noticed within minutes.
A task review is a gate. Never accept a report missing either the specification verdict or the quality verdict. Implementer self-review never replaces it.
Fix loops resume the original implementer for the first rounds and switch to a fresh implementer on a more capable model after that. Every round ends with a scoped re-review.
Never fix findings yourself in the controller session. Your context stays clean for coordination, and controller fixes skip review.
When no subagent tool exists, execute the plan inline and keep the same review gates, instead of substituting a tool that cannot do the job.

Re-engage the implementation subagent — the same one, addressed by the name or id its launch returned; a fresh launch is not re-engagement.
Spawn one per requested artifact, telling it only: the spec, the path of the canonical record (its sole source — read it in full), the output path, and "return ONLY the written file path."
This keeps the heavy generation out of the main thread and proves the record is genuinely the canonical source.

Let the worker write the deliverable itself and return only the confirmation and the counts - never the artefact content, so the orchestrator context stays small.
After dispatching the subagent, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result.
This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.
<!-- vpmodule:atom:end delegate-subagent-work -->
<!-- vpmodule:atom:begin maintain-plan-ledger -->
---
instruction_id: maintain-plan-ledger
title: Keep a per-plan ledger as the recovery map
summary: "Record the plan's identity, completion lines, fix rounds, and deferred minors in its own ledger so the work can be resumed and audited."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A plan runs across several tasks or can be interrupted before the end.
conditions_does_not_apply_when: The work is one short action with nothing to resume.
artifact_contract_output_type: plan-ledger
artifact_contract_required_data:
  - plan identity
  - completed tasks
  - rulings
  - current round
artifact_contract_verified_by: ledger entries match commits and test results
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/references/resuming.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-03-implement.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep a per-plan ledger as the recovery map
Each plan owns a workspace, home to every artifact for THIS plan: ledger, briefs, reports, review packages.
Create the ledger with its identity as the first line: `# SDD ledger — plan: <plan file path>`.
Check for this plan's ledger at `<workspace>/progress.md`.
If its first line names your plan file, tasks with a `Task <N>: complete` line are DONE — do not re-dispatch them; resume at the first task without one.
A task whose last line is a fix round is mid-loop: resume the loop at the next round.
A ledger whose first line names a different plan file — or a stray ledger at the old flat path `.superpowers/sdd/progress.md` — is another plan's progress: leave it in place and start your own, fresh.
Record BASE (`git rev-parse HEAD`) before dispatching — the review package and fix-round diffs need it. If the recorded base already holds a value (resumed run), preserve it — never overwrite it.
Append the completion line to the ledger in the same message as your other bookkeeping: `Task <N>: complete (commits <base7>..<head7>, review clean)`.
After each round, append to the ledger: `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`.
Record Minor findings in the progress ledger as you go: `Task <N>: minor (deferred): <one-liner>`.
A roll-up nobody reads is a silent discard.
The ledger is what survives compaction.
Controllers without one have re-dispatched entire completed task sequences.
Sibling directories belong to other plans; leave them alone.
Delete this plan's workspace only when the final review is clean and its fixes are committed — the git history is the record now.
Before you delete anything, collect every ledger line containing `Ruling:` into your final message.
A ruling that dies with the workspace was a decision made in secret.
<!-- vpmodule:atom:end maintain-plan-ledger -->
<!-- vpmodule:atom:begin review-task-both-verdicts -->
---
instruction_id: review-task-both-verdicts
title: Review a task with both verdicts
summary: "Give the reviewer the brief, the report, the diff file, and the global constraints, and require a spec verdict and a quality verdict."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A task is finished and must be accepted or sent back.
conditions_does_not_apply_when: The task has no finished diff or report yet.
artifact_contract_output_type: task-review
artifact_contract_required_data:
  - diff range
  - spec verdict
  - quality verdict
artifact_contract_verified_by: two independent verdicts recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/references/cannot-verify.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/task-reviewer-prompt.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Review a task with both verdicts
The reviewer reads the task's diff once and returns two verdicts: spec compliance and code quality.
This is a task-scoped gate, not a merge review — a broad whole-branch review happens separately after all tasks are complete.
The task reviewer gets three paths — the same brief file, the report file, and the review package — plus the global constraints that bind the task.
Hand the reviewer its diff as a file, never a diff pasted into the dispatch.
The reviewer sees the commit list, stat summary, and full diff with context in one Read call.
Do not ask a reviewer to re-run tests the implementer already ran on the same code — the implementer's report carries the test evidence.
Do not pre-judge findings for the reviewer — never instruct a reviewer to ignore or not flag a specific issue.
If the prompt you are writing contains "do not flag," "don't treat X as a defect," "at most Minor," or "the plan chose" — stop: you are pre-judging.
The task reviewer may report "⚠️ Cannot verify from diff" items — requirements that live in unchanged code or span tasks.
These do not block the rest of the review, but you must resolve each one yourself before marking the task complete.
If you confirm an item is a real gap, treat it as a failed spec review — it enters the fix loop with the other findings.
Never skip the task review, and never accept a report missing either verdict.
Implementer self-review never replaces the task review; both are needed.
The reviewer's final message begins directly with the spec-compliance verdict.
Acknowledge what was done well before listing issues — accurate praise helps the implementer trust the rest of the feedback.
<!-- vpmodule:atom:end review-task-both-verdicts -->
<!-- vpmodule:atom:begin select-model-per-task -->
---
instruction_id: select-model-per-task
title: Choose the worker by task complexity
summary: "Use the least powerful model that can handle each role, and name it explicitly so an omitted default does not defeat the choice."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A task or a review is about to be dispatched to a worker.
conditions_does_not_apply_when: The same worker does the work without a choice of level.
artifact_contract_output_type: worker-selection
artifact_contract_required_data:
  - task complexity
  - chosen level
  - reason
artifact_contract_verified_by: worker capability matches recorded task complexity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Choose the worker by task complexity
Use the least powerful model that can handle each role to conserve cost and increase speed.
Mechanical implementation tasks (isolated functions, clear specs, 1-2 files): use a fast, cheap model.
Most implementation tasks are mechanical when the plan is well-specified.
Integration and judgment tasks (multi-file coordination, pattern matching, debugging): use a standard model.
Architecture and design tasks: use the most capable available model.
The final whole-branch review is one of these — dispatch it on the most capable available model, not the session default.
Review tasks: choose the model with the same judgment, scaled to the diff's size, complexity, and risk.
A small mechanical diff does not need the most capable model; a subtle concurrency change does.
Scoped re-reviews of small fix diffs take a cheap-to-mid tier.
Fix-loop escalation (rounds 4-5): use a model at least one tier above the implementer that got stuck.
Always specify the model explicitly when dispatching a subagent.
An omitted model inherits your session's model — often the most capable and most expensive — which silently defeats this section.
Turn count beats token price.
Wall-clock and context cost scale with how many turns a subagent takes, and the cheapest models routinely take 2-3× the turns on multi-step work — costing more overall.
Use a mid-tier model as the floor for reviewers and for implementers working from prose descriptions.
When the task's plan text contains the complete code to write, the implementation is transcription plus testing: use the cheapest tier for that implementer.
Keep the lead on the strongest model; researchers at most one tier down; judgment work never on the smallest tier.
- The model profile system, resolved per agent, lets you assign cheaper tiers to less critical agents.
<!-- vpmodule:atom:end select-model-per-task -->
<!-- vpmodule:atom:begin wait-boundedly-for-workers -->
---
instruction_id: wait-boundedly-for-workers
title: Wait for workers in bounded stretches
summary: "Keep doing local work while workers run, wait in bounded stretches, and reconcile live children between them instead of polling."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker runs asynchronously and its result is needed for the next step.
conditions_does_not_apply_when: "The result is already in hand, or the work is not delegated."
artifact_contract_output_type: bounded-wait
artifact_contract_required_data:
  - local work
  - wait stretches
  - worker state
artifact_contract_verified_by: no silent or unbounded wait
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review-fix.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/diagnose-issues.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Wait for workers in bounded stretches
Never poll a wait interface with short timeouts.
Never sit in one silent, open-ended wait either.
While you have local work, keep working: ledger updates, packaging the next review, reading reports.
Child results arrive on their own.
When you are genuinely idle, wait in bounded stretches (five to ten minutes, where your platform allows).
Between stretches post one line of status and reconcile your live children: list them.
Chase any that finished without reporting.
A bounded stretch keeps nearly all of a long wait's efficiency while guaranteeing a stuck or lost child is noticed within minutes, not at the end of the session.
Everything you paste into a dispatch prompt — and everything a subagent prints back — stays resident in your context for the rest of the session and is re-read on every later turn.
Hand artifacts over as files.
Record the implementer's agent identity from the dispatch result.
A real session's dispatch hit 42k chars of which 99% was pasted history.
A dispatch prompt describes one task, not the session's history.
Never dispatch multiple implementation subagents in parallel (conflicts).
While the worker owns the task, do not touch the task: do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result.
This prevents duplicate work and conflicting edits.
<!-- vpmodule:atom:end wait-boundedly-for-workers -->