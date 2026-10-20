---
instruction_id: handle-implementer-report
title: Handle the implementer report by status
summary: "Read each report fully, answer questions, and respond to each of the four statuses with its own action instead of retrying unchanged."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: An implementer returned a report for a task.
conditions_does_not_apply_when: The task is still running and there is no report.
artifact_contract_output_type: implementer-report-handling
artifact_contract_required_data:
  - report status
  - concerns
  - next action
artifact_contract_verified_by: every report status has a recorded response
compatibility_excludes: []
compatibility_requires:
  - delegate-subagent-work
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/implementer-prompt.md
status: active
revision: 2
---

# Handle the implementer report by status
Implementer subagents report one of four statuses: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED.
DONE: generate the review package, then dispatch the task reviewer with the printed path.
DONE_WITH_CONCERNS: the implementer completed the work but flagged doubts. Read the concerns before proceeding.
If the concerns are about correctness or scope, address them before review.
If they're observations (e.g., "this file is getting large"), note them and proceed to review.
NEEDS_CONTEXT: the implementer needs information that wasn't provided. Provide the missing context and re-dispatch.
BLOCKED: the implementer cannot complete the task. Assess the blocker.
If it's a context problem, provide more context and re-dispatch with the same model.
If the task requires more reasoning, re-dispatch with a more capable model.
If the task is too large, break it into smaller pieces.
If the plan itself is wrong, rule on the correction, ledger it, and re-dispatch with the ruling carried in the dispatch.
Never ignore an escalation or force the same model to retry without changes.
If the implementer asks questions — before starting or mid-task — answer clearly and completely.
Provide additional context if needed, and don't rush it into implementation.
The implementer writes the full report to the report file and returns only status, commits, a one-line test summary, and concerns.
