---
instruction_id: make-illegal-states-unrepresentable
title: Make illegal states unrepresentable
summary: "Move the rules for legal values into types and constructors, so the compiler rejects impossible states, mismatched primitives, and unhandled variants."
capability_tags:
  - make-states-unrepresentable
pattern_tags:
  - state-modeling
conditions_applies_when: An object has several interdependent fields or flags whose combinations can be impossible.
conditions_does_not_apply_when: Data arrives from an external source and is checked only at the entry boundary.
artifact_contract_output_type: constrained-type
artifact_contract_required_data:
  - list of legal states
  - type
  - single constructor
  - test that an illegal state cannot be built
artifact_contract_verified_by: "the project's type checks and a test that fails to build an illegal state"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-type-system-discipline/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/references/patterns.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
---

# Make illegal states unrepresentable
Make the compiler reject impossible states, mismatched primitives, and unhandled variants.
Prefer defining errors and special cases out of existence over proliferating handlers.
Brand semantic primitives.
An identifier for a user and an identifier for an order are strings underneath but should not be interchangeable.
Give each its own type, such as a branded intersection in TypeScript or a newtype elsewhere.
Validate once at creation, trust the type downstream.
If two arguments share a primitive type but mean different things, brand them.
Model variants with a literal discriminant so impossible combinations cannot be represented.
No optional-field bags.
Consumer gets type narrowing.
Build the shape so the illegal value cannot be constructed: a non-empty tuple for non-empty, pairs for even length, start plus duration for a range.
Not a runtime guard, not a wish for refinement types.
Keep a plain array while every operation on it stays total.
Strengthen to a non-empty type only where the loose type forces a non-null assertion, a cast, or a "should never happen" throw.
In default arms, assign the discriminant to a never-typed local so the compiler errors when a new variant is added.
Derive types from authoritative schemas instead of hand-rolling a parallel type.
Have a parse function at every boundary that turns unstructured input into the typed model.
