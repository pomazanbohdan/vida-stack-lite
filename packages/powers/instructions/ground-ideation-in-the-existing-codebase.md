---
instruction_id: ground-ideation-in-the-existing-codebase
title: Ground the ideation in the existing codebase
summary: "Scan the surrounding code for architecture, patterns, constraints and prior art, and ground the variations in what actually exists."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The ideation happens inside an existing codebase or project.
conditions_does_not_apply_when: There is no code or project around the idea.
artifact_contract_output_type: codebase-context
artifact_contract_required_data:
  - the existing architecture and patterns found
  - the constraints they impose
  - the prior art found
artifact_contract_verified_by: each variation refers to what the codebase already contains
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/examples.md
status: active
revision: 1
---

# Ground the ideation in the existing codebase

If running inside a codebase: scan for relevant context — existing architecture, patterns, constraints, prior art. Ground your variations in what actually exists. Reference specific files and patterns when relevant.

**Don't ignore the codebase.** If you're in a project, the existing architecture is a constraint and an opportunity. Use it.
