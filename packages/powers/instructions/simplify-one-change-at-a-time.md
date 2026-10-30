---
instruction_id: simplify-one-change-at-a-time
title: Simplify one change at a time
summary: "Understand the target code first, apply one simplification at a time with a test run after each, and revert the change that breaks the tests."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: Existing code is simplified to make it clearer without changing its behaviour.
conditions_does_not_apply_when: The change adds new behaviour and belongs to the test-first loop.
artifact_contract_output_type: simplification-record
artifact_contract_required_data:
  - the target scope
  - the simplifications applied
  - the test result after each change
  - the change that was reverted
artifact_contract_verified_by: the full test suite and the build pass after the last simplification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/code-simplify.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Simplify one change at a time
Simplify recently changed code (or the specified scope) while preserving exact behavior:
1. Read the project's rules file
and study project conventions.
2. Identify the target code — recent changes unless a broader scope is specified
3. Understand the code's purpose, callers, edge cases, and test coverage before touching it
4. Scan for simplification opportunities:
   - Deep nesting → guard clauses or extracted helpers
   - Long functions → split by responsibility
   - Nested ternaries → if/else or switch
   - Generic names → descriptive names
   - Duplicated logic → shared functions
   - Dead code → remove after confirming
5. Apply each simplification incrementally — run tests after each change
6. Verify all tests pass, the build succeeds, and the diff is clean
If tests fail after a simplification, revert that change and reconsider.
