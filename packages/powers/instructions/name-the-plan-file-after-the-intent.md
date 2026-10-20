---
instruction_id: name-the-plan-file-after-the-intent
title: Name the plan file after the intent
summary: "The plan file is a kebab-case slug taken from the intent, led by the tracking identifier when there is one, and a second plan for the same name gets a numeric suffix."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A new plan file is created for the current intent.
conditions_does_not_apply_when: The plan file already exists and is being resumed.
artifact_contract_output_type: plan-file-name
artifact_contract_required_data:
  - the kebab-case slug
  - the tracking identifier that leads it
  - the decision to resume the draft or to add a suffix
artifact_contract_verified_by: the file name is a kebab-case slug of the intent and an existing plan was never overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-01-clarify-and-route.md
status: active
revision: 1
---

# Name the plan file after the intent

Derive a valid kebab-case slug from the current intent.

If the intent references a tracking identifier (story number, issue number, ticket ID), lead the slug with it (e.g. `3-2-digest-delivery`, `gh-47-fix-auth`).

If its status is `draft`, treat it as the same work and resume it

Otherwise append `-2`, `-3`, etc.
