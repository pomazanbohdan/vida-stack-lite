---
instruction_id: never-read-an-empty-selection-as-completion
title: Never read an empty selection as completion
summary: An empty selection of remaining work is not reported as a finished unit of work.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The selection of remaining work came back empty.
conditions_does_not_apply_when: The selection still contains work.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the reason the selection was empty
  - the blocked plans
artifact_contract_verified_by: an empty selection was not reported as a finished unit of work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Never read an empty selection as completion
"No plan work left" and "phase fully done" are different conditions
A filtered run finding nothing left in ITS slice says nothing about whether the phase as a whole is done, and must never jump to verification.
Blocked-and-incomplete must never be reported as finished.
the phase is NOT finished — it is **stuck on a halt**.
