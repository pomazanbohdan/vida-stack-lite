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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-guard-the-context-window/SKILL.md
status: active
revision: 4
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
When no subagent tool exists, execute the plan inline and keep the same review gates.
