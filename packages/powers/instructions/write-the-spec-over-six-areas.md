---
instruction_id: write-the-spec-over-six-areas
title: Write the spec over six areas
summary: "The spec covers objective, commands, project structure, code style, testing strategy and boundaries, is saved at the project root, and is confirmed with the user before anything follows."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A structured spec is written for a project.
conditions_does_not_apply_when: The six areas are already fixed by an existing document.
artifact_contract_output_type: spec
artifact_contract_required_data:
  - objective
  - commands
  - project structure
  - code style
  - testing strategy
  - boundaries
artifact_contract_verified_by: the spec covers all six areas and the user confirmed it
compatibility_excludes: []
compatibility_requires:
  - elicit-the-goal-users-and-boundaries-before-writing-the-spec
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/spec.md
status: active
revision: 1
---

# Write the spec over six areas
Then generate a structured spec covering all six core areas: objective, commands, project structure, code style, testing strategy, and boundaries.
Save the spec as SPEC.md in the project root and confirm with the user before proceeding.
