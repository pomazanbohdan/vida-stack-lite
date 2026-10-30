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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/task-reviewer-prompt.md
status: active
revision: 3
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
