---
instruction_id: simplify-structure-by-pattern
title: Simplify structure by the pattern it shows
summary: Recognise the structural patterns of complexity and apply the named simplification each one calls for.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Code shows a structural complexity signal that a named simplification answers.
conditions_does_not_apply_when: The complexity comes from an external constraint that cannot change.
artifact_contract_output_type: structural-simplification
artifact_contract_required_data:
  - the pattern
  - the signal
  - the simplification applied
artifact_contract_verified_by: each recognised pattern has its named simplification applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Simplify structure by the pattern it shows

Scan for these patterns — each one is a concrete signal, not a vague smell:

**Structural complexity:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Deep nesting (3+ levels) | Hard to follow control flow | Extract conditions into guard clauses or helper functions |
| Long functions (50+ lines) | Multiple responsibilities | Split into focused functions with descriptive names |
| Nested ternaries | Requires mental stack to parse | Replace with if/else chains, switch, or lookup objects |
| Boolean parameter flags | `doThing(true, false, true)` | Replace with options objects or separate functions |
| Repeated conditionals | Same `if` check in multiple places | Extract to a well-named predicate function |
