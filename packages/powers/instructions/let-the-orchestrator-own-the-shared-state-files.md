---
instruction_id: let-the-orchestrator-own-the-shared-state-files
title: Let the orchestrator own the shared state files
summary: The workers leave the shared tracking files alone and the coordinator writes them once.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Several workers write to the same shared tracking files.
conditions_does_not_apply_when: One worker writes them.
artifact_contract_output_type: shared-state-update
artifact_contract_required_data:
  - the plans that completed
artifact_contract_verified_by: the workers left the shared files alone and the coordinator wrote them once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Let the orchestrator own the shared state files
The orchestrator is the single writer for these files. After worktrees are merged back, update shared artifacts once for every completed plan in the wave
Do NOT modify the shared state files.
