---
instruction_id: validate-a-parallel-fan-out-before-adopting-it
title: Validate a parallel fan-out before you adopt it
summary: "Four questions decide whether the work splits into parallel agents, and a single no sends it back to one agent or a sequential run."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Work is about to be split across several agents that run at the same time.
conditions_does_not_apply_when: The work runs in one agent.
artifact_contract_output_type: fan-out-validation
artifact_contract_required_data:
  - the four answers
  - the independence argument
  - the fallback chosen if any answer is no
artifact_contract_verified_by: "all four answers are yes, or the fallback is used instead"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
status: active
revision: 1
---

# Validate a parallel fan-out before you adopt it
Multiple personas operate on the same input concurrently, each producing an independent report. A merge step (in the main agent's context) synthesizes them into a single decision.
**Use when:**
- The sub-tasks are genuinely independent (no shared mutable state, no ordering dependency)
- Each sub-agent benefits from its own context window
- The merge step is small enough to stay in the main context
- Wall-clock latency matters
**Validation checklist before adopting this pattern:**
- Can I run all sub-agents at the same time without ordering issues?
- Does each persona produce a different *kind* of finding, not just the same finding from a different angle?
- Will the merge step fit in the main agent's remaining context?
- Is the user's wait time long enough that parallelism is actually noticeable?
If any answer is "no," fall back to direct invocation or a single-persona command.
**Cost:** N parallel sub-agent contexts + one merge turn. Higher than direct invocation, but faster wall-clock and produces better reports because each sub-agent stays focused on its single perspective.
