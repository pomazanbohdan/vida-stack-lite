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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 3
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

When two currently-live sources or companions disagree on the same field, or an either/or never got resolved, surface it to the user rather than silently choosing — the resolution is itself a new run log entry.

Never merge competing variants into a combined criterion - preserve every variant for the user to resolve.
The fix hint is ONE non-binding example route: a smaller or different mechanism reaching the same property resolves it — say which.
if a hint would contradict one, or the property is unreachable without breaking one, return
with the conflict and the alternatives rather than applying or working around it.
Keep the dominant rating in the rating field.
Add a context note to the dimension's summary describing the split
