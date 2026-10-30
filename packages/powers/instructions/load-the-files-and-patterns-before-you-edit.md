---
instruction_id: load-the-files-and-patterns-before-you-edit
title: Load the files and the patterns before you edit
summary: "Read the file you will change, its tests, an existing example of the pattern and the types involved before you edit."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A file is about to be edited or a pattern is about to be implemented.
conditions_does_not_apply_when: The edit is a mechanical change in an already-read file.
artifact_contract_output_type: pre-task-context
artifact_contract_required_data:
  - the files read
  - the example pattern found
  - the types read
artifact_contract_verified_by: "the file to change, its tests, an existing example and the types were read before the edit"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load the files and the patterns before you edit

Before editing a file, read it. Before implementing a pattern, find an existing example in the codebase.

**Pre-task context loading:**
1. Read the file(s) you'll modify
2. Read related test files
3. Find one example of a similar pattern already in the codebase
4. Read any type definitions or interfaces involved

Missing examples | Agent invents a new style instead of following yours | Include one example of the pattern to follow

Agent invents APIs or imports that don't exist

Agent re-implements utilities that already exist in the codebase
**MANDATORY read_first gate:** If the task has a `<read_first>` field (or the resolved content carries one), you MUST read every listed file BEFORE making any edits. This is not optional.
Do not skip files because you "already know" what's in them — read them. The read_first files establish ground truth for the task.
Files the executor MUST read before touching anything.
The file being modified (so executor sees current state, not assumptions)
Any file whose patterns, signatures, types, or conventions must be replicated or respected
