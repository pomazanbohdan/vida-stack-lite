---
instruction_id: explore-in-read-only-before-planning
title: Explore in read-only before you plan
summary: "Read the spec, the code, the patterns, the dependencies and the unknowns first, because planning writes no code."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A spec or clear requirements exist and the work has not been planned yet.
conditions_does_not_apply_when: The task is a single file with obvious scope.
artifact_contract_output_type: planning-notes
artifact_contract_required_data:
  - the spec
  - the codebase sections read
  - the existing patterns
  - the dependencies
  - the risks and unknowns
artifact_contract_verified_by: no code was written during the exploration and every note came from a read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Explore in read-only before you plan

Before writing any code, operate in read-only mode:

- Read the spec and relevant codebase sections
- Identify existing patterns and conventions
- Map dependencies between components
- Note risks and unknowns

**Do NOT write code during planning.**
The output is a plan document and a task list recorded in the task list target, not implementation.
