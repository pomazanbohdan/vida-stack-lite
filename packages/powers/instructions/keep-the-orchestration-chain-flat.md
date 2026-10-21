---
instruction_id: keep-the-orchestration-chain-flat
title: Keep the orchestration chain flat
summary: The steps of a chain run at the same nesting level instead of nesting deeper and deeper.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A chain of steps is about to hand over to the next step automatically.
conditions_does_not_apply_when: Only one step runs.
artifact_contract_output_type: chain-plan
artifact_contract_required_data:
  - the steps of the chain
artifact_contract_verified_by: the steps of the chain run at the same nesting level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/chain.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Keep the orchestration chain flat
This keeps the auto-advance chain flat — discuss, plan, and execute all run at the same nesting level rather than spawning increasingly deep Task agents.
