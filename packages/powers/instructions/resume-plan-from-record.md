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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-brainstorming/references/resume.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 3
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
