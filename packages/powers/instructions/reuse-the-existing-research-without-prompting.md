---
instruction_id: reuse-the-existing-research-without-prompting
title: Reuse the existing research without prompting
summary: When the research artifact already exists it is used as it is — the run neither asks nor re-does it.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The research artifact for the work already exists.
conditions_does_not_apply_when: A refresh was asked for explicitly.
artifact_contract_output_type: research-reuse
artifact_contract_required_data:
  - the artifact that was reused
  - the reason no prompt was shown
artifact_contract_verified_by: the existing research was used and the run neither prompted nor re-spawned it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/research-only-modifiers.md
status: active
revision: 1
---

# Reuse the existing research without prompting
auto-use the existing research and exit cleanly — do not prompt, do not re-spawn.
force-refresh re-research without prompting.
Do not prompt when the artifact exists.
