---
instruction_id: elicit-the-goal-users-and-boundaries-before-writing-the-spec
title: "Elicit the goal, the users and the boundaries before writing the spec"
summary: "The spec starts from four questions: the objective and target users, the core features and acceptance criteria, the stack preferences and constraints, and the boundaries."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The request is a new capability and the spec does not exist yet.
conditions_does_not_apply_when: The conversation already contains what the spec must say.
artifact_contract_output_type: clarification-set
artifact_contract_required_data:
  - the objective and target users
  - the core features and acceptance criteria
  - the stack preferences and constraints
  - the boundaries
artifact_contract_verified_by: each of the four areas has an answer before the spec is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/spec.md
status: active
revision: 1
---

# Elicit the goal, the users and the boundaries before writing the spec
Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)
