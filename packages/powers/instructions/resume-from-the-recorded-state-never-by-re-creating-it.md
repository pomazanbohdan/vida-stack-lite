---
instruction_id: resume-from-the-recorded-state-never-by-re-creating-it
title: "Resume from the recorded state, never by re-creating it"
summary: "A resume derives what is still runnable from the recorded state; it never re-parses the task list and never re-creates the batch, and a refused resume stops the run instead of starting a new one."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run is resumed from a recorded batch or plan state.
conditions_does_not_apply_when: The run starts from scratch.
artifact_contract_output_type: resume-state
artifact_contract_required_data:
  - the eligible items
  - the transitions that were applied
  - the refusal that stopped the run
artifact_contract_verified_by: nothing was re-created and the refusal stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/resume-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Resume from the recorded state, never by re-creating it
Never re-parse a task list or re-run
the single source of truth for which items are still runnable
Print the CLI's error message verbatim and STOP
Do not dispatch anything, do not create a new batch on the user's behalf
it re-derives per-item progress from which artifacts already exist on disk
never from a separate "resume" code path
