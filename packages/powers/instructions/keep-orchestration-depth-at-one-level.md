---
instruction_id: keep-orchestration-depth-at-one-level
title: Keep the orchestration depth at one level
summary: An agent does not call another agent and an orchestrator does not call an orchestrator; the merge happens in the main context.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A workflow is designed in which one agent or coordinator calls another.
conditions_does_not_apply_when: The workflow has a single level of agents.
artifact_contract_output_type: orchestration-depth-review
artifact_contract_required_data:
  - the depth of the proposed workflow
  - the level that performs the merge
artifact_contract_verified_by: the orchestration depth is at most one level and the merge happens in the main agent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the orchestration depth at one level
### B. Persona that calls another persona
**Why it fails:**
- Personas were designed to produce a single perspective; chaining them defeats that
- The summary the calling persona passes loses context the called persona needs
- Failure modes multiply (which persona's output format wins? whose rules apply?)
- Hides cost from the user
**What to do instead:** have the calling persona *recommend* a follow-up audit in its report. The user or a slash command runs the second pass.
### D. Deep persona trees
**Why it fails:**
- Each layer adds latency and tokens with no decision value
- Debugging becomes a multi-level investigation
- The leaf personas lose context to multiple summarization steps
**What to do instead:** keep the orchestration depth at most 1 (slash command → personas). The merge happens in the main agent.
This keeps the auto-advance chain flat — each phase runs at the same nesting level rather than spawning deeper Task agents.
Run plan-phase inline (do NOT wrap it in a nested agent) — the orchestrator runs at the top level, where the planning step can still spawn the planner and the checker one level down.
