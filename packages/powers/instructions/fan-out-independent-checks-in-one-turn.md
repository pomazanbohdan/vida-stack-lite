---
instruction_id: fan-out-independent-checks-in-one-turn
title: Fan out the independent checks in one turn
summary: "Independent specialists are issued in a single turn so they truly run in parallel, they never call each other, and each returns only its own report."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several independent specialists are about to examine the same change.
conditions_does_not_apply_when: The checks depend on each other or share mutable state.
artifact_contract_output_type: fan-out-plan
artifact_contract_required_data:
  - the specialists
  - the single turn that issues them
  - the report each returns
artifact_contract_verified_by: the specialists were issued in one turn and each returned only its report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/ship.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
status: active
revision: 2
---

# Fan out the independent checks in one turn
It runs three specialist personas in parallel against the current change, then merges their reports into a single go/no-go decision with a rollback plan. The personas operate independently — no shared state, no ordering — which is what makes parallel execution safe and useful here.
Spawn three subagents concurrently
using the subagent tool.
**Issue all three subagent tool
calls in a single assistant turn so they execute in parallel** — sequential calls defeat the purpose of this command.
- Subagents cannot spawn other subagents — do not let one persona delegate to another.
- Each subagent gets its own context window and returns only its report to this main session.
Once all three reports are back, the main agent (not a sub-persona) synthesizes them:

Announce skipped lenses first, then launch every active lens before handling any lens's result.

When running lenses as subagents, spawn every reviewer before reading or reacting to any of their output; begin collection and triage only once all are launched.
