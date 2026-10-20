---
instruction_id: remove-duplication-and-dead-weight
title: Remove duplication and dead weight
summary: "Extract duplicated logic, delete what is truly dead, inline the wrapper that adds nothing and drop redundant assertions."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "The code under simplification contains redundancy, dead weight or a redundant abstraction."
conditions_does_not_apply_when: The abstraction exists for extensibility or testability and is still needed.
artifact_contract_output_type: redundancy-removal
artifact_contract_required_data:
  - the pattern
  - the signal
  - the removal applied
artifact_contract_verified_by: each recognised redundancy pattern has its named removal applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 1
---

# Remove duplication and dead weight

**Redundancy:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Duplicated logic | Same 5+ lines in multiple places | Extract to a shared function |
| Dead code | Unreachable branches, unused variables, commented-out blocks | Remove (after confirming it's truly dead) |
| Unnecessary abstractions | Wrapper that adds no value | Inline the wrapper, call the underlying function directly |
| Over-engineered patterns | Factory-for-a-factory, strategy-with-one-strategy | Replace with the simple direct approach |
| Redundant type assertions | Casting to a type that's already inferred | Remove the assertion |

"This abstraction might be useful later" | Don't preserve speculative abstractions. If it's not used now, it's complexity without value. Remove it and re-add when needed.
