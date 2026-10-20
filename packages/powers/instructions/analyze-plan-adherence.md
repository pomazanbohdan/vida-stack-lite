---
instruction_id: analyze-plan-adherence
title: Compare execution with the agreed plan
summary: "Recover the plan the session agreed to and map every step to what happened, marking structural events that precede drift."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The complaint concerns a departure from the plan or unrequested work.
conditions_does_not_apply_when: No agreed plan existed.
artifact_contract_output_type: plan-adherence-report
artifact_contract_required_data:
  - plan
  - executed steps
  - deviations
  - structural events
artifact_contract_verified_by: each plan step mapped to execution evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/plan-adherence.md
status: active
revision: 1
---

# Compare execution with the agreed plan
Recover the plan the session agreed to, then map each plan step to what happened.
"Plan" here means any agreed course of action, not git commits.
Find the agreed plan: a design or plan agreed in chat, a spec or plan file written during the session.
It can also be a todo-list record whose meaning was established in the case file, or any numbered checklist in assistant text.
Quote each plan step with its `path:line`.
Mark structural events between the plan and its execution: compaction events identified during discovery, resumes, aborted turns, and associated session dispatches.
Note their line numbers; plan drift right after one of these is a distinct finding.
For each plan step, find the tool calls and assistant text that executed it, or establish that none did.
Report steps skipped and steps executed out of order.
Report steps silently changed and steps invented.
A step silently changed is one where execution differs from the plan step in a way the assistant never announced; quote both.
Report drift immediately after a structural event, citing the event line and the first divergent action.
If there is no recoverable plan, say so as the only finding, with the lines you checked.
Do not invent a plan after the fact.
