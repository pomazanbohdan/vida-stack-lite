---
instruction_id: never-dispatch-a-prompt-that-still-holds-a-placeholder
title: Never dispatch a prompt that still holds a placeholder
summary: "Before a prompt leaves, every conditional in it is resolved to concrete text; a prompt that still holds template syntax is a halt, not a dispatch."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - verification-before-completion
conditions_applies_when: A prompt is composed for a delegated worker or a spawned process.
conditions_does_not_apply_when: The prompt is a fixed template with nothing to substitute.
artifact_contract_output_type: prompt-resolution-check
artifact_contract_required_data:
  - the unresolved markers
  - the source that was unreadable
  - the halt reason
artifact_contract_verified_by: the dispatched prompt contains no unresolved marker and no un-substituted template syntax
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/tdd-applicability-resolution.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 1
---

# Never dispatch a prompt that still holds a placeholder
Before calling Agent(), confirm every `${...}` conditional in the prompt below
If any marker's value was not computed, HALT — do not dispatch a prompt containing literal `${...}` template syntax
the resolution check after the assignment fails closed: if any embed source cannot be read, do NOT spawn a generic process and hope — halt the wave
