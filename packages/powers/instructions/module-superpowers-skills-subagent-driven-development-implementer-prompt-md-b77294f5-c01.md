---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-subagent-driven-development-implementer-prompt-md-b77294f5-c01"
title: "superpowers: skills/subagent-driven-development/implementer-prompt.md module"
summary: "Carrier for 2 atomic instructions from superpowers:skills/subagent-driven-development/implementer-prompt.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/subagent-driven-development/implementer-prompt.md\"}"
atom_ids:
  - escalate-blocked-work
  - handle-implementer-report
atom_count: 2
atoms: "[{\"atom_id\":\"escalate-blocked-work\",\"file_sha256\":\"b188e80e2c2b118b6d7cae2c7a14afe56e131f7d46cd06398c404fdc17786511\",\"content_sha256\":\"d2cfcdb967cd8651925302c955da11732afd96d0a01cc83c55c1a48c2fd07bfc\",\"file_bytes\":3413,\"body_bytes\":2074},{\"atom_id\":\"handle-implementer-report\",\"file_sha256\":\"ca88c4906cae256cb4a469cf6f0d2dd95a8fee927d212928dcbbcb6b09a4b265\",\"content_sha256\":\"a4d6b520b42ae524873bdfe3ab776d98ebdc04fb7a04317acc8d614c79442019\",\"file_bytes\":2676,\"body_bytes\":1427}]"
carrier_sha256: 13ce4e33b7f3b293616f7215c1091a7ca28cff5a26a5ef2aae5adb7b48d9c3a8
carrier_bytes: 6296
revision: 1
status: active
---
<!-- vpmodule:atom:begin escalate-blocked-work -->
---
instruction_id: escalate-blocked-work
title: Stop and escalate when the task is over your head
summary: "Stop rather than produce unsure work, and report the status with what you are stuck on, what you tried, and what help you need."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "The task needs a decision, context, or capability that was not provided."
conditions_does_not_apply_when: The task runs inside the provided context and authority.
artifact_contract_output_type: blocker-report
artifact_contract_required_data:
  - blocker
  - attempts
  - help needed
artifact_contract_verified_by: the blocker report names the missing input
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/implementer-prompt.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop and escalate when the task is over your head
It is always OK to stop and say "this is too hard for me."
Bad work is worse than no work.
You will not be penalized for escalating.
STOP and escalate when the task requires architectural decisions with multiple valid approaches.
STOP and escalate when you need to understand code beyond what was provided and can't find clarity.
STOP and escalate when you feel uncertain about whether your approach is correct.
STOP and escalate when the task involves restructuring existing code in ways the plan didn't anticipate.
STOP and escalate when you've been reading file after file trying to understand the system without progress.
Report back with status BLOCKED or NEEDS_CONTEXT.
Describe specifically what you're stuck on, what you've tried, and what kind of help you need.
The controller can provide more context, re-dispatch with a more capable model, or break the task into smaller pieces.
If the implementer said it's stuck, something needs to change.
Use BLOCKED if you cannot complete the task.
Use NEEDS_CONTEXT if you need information that wasn't provided.
Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
Never silently produce work you're unsure about.
On blocked completion, the workflow records the final status and a blocking condition
Handle `blocked` as a routing signal, not just a failure signal
A blocked plan halts every later dispatch of its ticket.
In practice, `blocked` usually means the workflow ran into a situation where unattended execution would be unsafe. That is often the point where a higher-level orchestrator, another workflow, or a human should take over.
- **Rules 1-3** (bugs, missing critical, blockers): auto-fix, test, verify, track as deviations
- **Rule 4** (architectural changes): STOP, present decision to user, await approval
**Scope boundary**: do not auto-fix pre-existing issues unrelated to current task
**Fix attempt limit**: max 3 retries per deviation before escalating
**Priority**: Rule 4 (STOP) > Rules 1-3 (auto) > unsure → Rule 4
<!-- vpmodule:atom:end escalate-blocked-work -->
<!-- vpmodule:atom:begin handle-implementer-report -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/references/handling-reports.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/implementer-prompt.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
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
<!-- vpmodule:atom:end handle-implementer-report -->