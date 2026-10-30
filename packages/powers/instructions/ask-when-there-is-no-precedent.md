---
instruction_id: ask-when-there-is-no-precedent
title: Ask when there is no precedent
summary: "Look for a precedent in the existing code; when there is none, stop and ask instead of inventing the requirement."
capability_tags:
  - curate-context
pattern_tags:
  - requirements-clarification
conditions_applies_when: A case has to be implemented that the specification does not cover.
conditions_does_not_apply_when: The specification covers the case.
artifact_contract_output_type: missing-requirement
artifact_contract_required_data:
  - the case not covered
  - the precedent search
  - the options presented
artifact_contract_verified_by: the requirement came from the owner rather than from the implementer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask when there is no precedent

If the spec doesn't cover a case you need to implement:

1. Check existing code for precedent
2. If no precedent exists, **stop and ask**
3. Don't invent requirements — that's the human's job

```
MISSING REQUIREMENT:
The spec defines task creation but doesn't specify what happens
when a user creates a task with a duplicate title.

Options:
A) Allow duplicates (simplest)
B) Reject with validation error (strictest)
C) Append a number suffix like "Task (2)" (most user-friendly)

→ Which behavior do you want?
```
