---
instruction_id: complete-an-unattended-pass-once
title: Complete an unattended pass once
summary: An unattended run writes its output once and does not start a second pass over its own output.
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: An unattended run has already written its canonical output once.
conditions_does_not_apply_when: The run is interactive and the user is present to answer.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the completed pass
artifact_contract_verified_by: no second pass is started over the output the run has already written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/auto.md
status: active
revision: 1
---

# Complete an unattended pass once
In `--auto` mode, the discuss step MUST complete in a **single pass**.
Do NOT re-read your own
context document
to find "gaps", "undefined types", or "missing decisions" and run additional passes.
This creates a self-feeding loop where each pass generates references that the next pass treats as gaps, consuming unbounded time and resources.
the discuss step is complete. Move on.
