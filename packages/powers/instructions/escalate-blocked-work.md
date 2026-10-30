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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/implementer-prompt.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 5
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
