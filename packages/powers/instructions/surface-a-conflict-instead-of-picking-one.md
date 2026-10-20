---
instruction_id: surface-a-conflict-instead-of-picking-one
title: Surface a conflict instead of picking one side
summary: "When the context contradicts itself, present the contradiction with its options and ask which one to follow."
capability_tags:
  - curate-context
pattern_tags:
  - requirements-clarification
conditions_applies_when: Two loaded sources disagree about what the work must do.
conditions_does_not_apply_when: The sources agree.
artifact_contract_output_type: surfaced-conflict
artifact_contract_required_data:
  - the two conflicting statements
  - the options
  - the question asked
artifact_contract_verified_by: the conflict was put to the owner instead of one side being chosen silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 1
---

# Surface a conflict instead of picking one side

Even with good context, you will encounter ambiguity. How you handle it determines outcome quality.

**Do NOT** silently pick one interpretation. Surface it:

```
CONFUSION:
The spec calls for REST endpoints, but the existing codebase uses GraphQL
for user queries (src/graphql/user.ts).

Options:
A) Follow the spec — add REST endpoint, potentially deprecate GraphQL later
B) Follow existing patterns — use GraphQL, update the spec
C) Ask — this seems like an intentional decision I shouldn't override

→ Which approach should I take?
```

Silent confusion | Agent guesses when it should ask | Surface ambiguity explicitly using the confusion management patterns above
