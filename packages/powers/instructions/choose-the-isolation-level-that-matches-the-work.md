---
instruction_id: choose-the-isolation-level-that-matches-the-work
title: Choose the isolation level that matches the work
summary: The shared repository with separate planning state and the separate worktree with independent branches are two different answers to two different questions.
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A choice of isolation is made for parallel work.
conditions_does_not_apply_when: Only one area of work is in flight.
artifact_contract_output_type: isolation-choice
artifact_contract_required_data:
  - the reason for the chosen level
  - what the other level would have given
artifact_contract_verified_by: the chosen level is named with the reason that decided it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/work-in-parallel-with-workstreams.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Choose the isolation level that matches the work
All the work lives in the **same repository** and shares the same git history
You need the isolation of a **separate git worktree** or clone per feature — fully independent branches, lock files, and build artefacts
The overhead of creating full git worktrees is not justified by the isolation you need
