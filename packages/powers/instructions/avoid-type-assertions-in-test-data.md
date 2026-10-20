---
instruction_id: avoid-type-assertions-in-test-data
title: Avoid type assertions in test data
summary: "Pass partial or intentionally wrong test data through a type-safe helper instead of type assertions, and only in tests."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test needs partial or wrong data and the language would otherwise need a type assertion.
conditions_does_not_apply_when: "The test uses complete, correctly typed data."
artifact_contract_output_type: test-data-helper
artifact_contract_required_data:
  - partial data
  - intentionally wrong data
  - type-safe call
artifact_contract_verified_by: the test compiles without an assertion and keeps autocomplete for wrong data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/misc/migrate-to-shoehorn/SKILL.md
status: active
revision: 4
---

# Avoid type assertions in test data
A helper like `shoehorn` lets you pass partial data in tests while keeping TypeScript happy. It replaces `as` assertions with type-safe alternatives.
**Test code only.** Never use it in production code.
Problems with `as` in tests:
- Trained not to use it
- Must manually specify target type
- Double-as (`as unknown as Type`) for intentionally wrong data
### Large objects with few needed properties
Instead of faking every property of a large object to satisfy the type, pass only the properties the test cares about through a partial helper.
### `as Type` → `fromPartial()`
Pass partial data that still type-checks.
### `as unknown as Type` → `fromAny()`
Pass intentionally wrong data (keeps autocomplete).
### When to use each
- `fromPartial()`: Pass partial data that still type-checks
- `fromAny()`: Pass intentionally wrong data (keeps autocomplete)
- `fromExact()`: Force full object (swap with fromPartial later)
## Workflow
1. **Gather requirements** - ask user:
   - What test files have `as` assertions causing problems?
   - Are they dealing with large objects where only some properties matter?
   - Do they need to pass intentionally wrong data for error testing?
2. **Install and migrate**:
   - Find test files with `as` assertions
   - Replace `as Type` with `fromPartial()`
   - Replace `as unknown as Type` with `fromAny()`
   - Run type check to verify
