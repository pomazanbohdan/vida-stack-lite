---
instruction_id: test-first-development
title: Write the test before the implementation
summary: "Start a behavior change with a test that fails before the implementation exists, then reach green with the smallest code and verify the whole suite."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A change adds or alters observable behavior.
conditions_does_not_apply_when: The change only reformats text without changing meaning or behavior.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - test scenario
  - expected result
  - observed failure
  - green run
artifact_contract_verified_by: "the project's full test suite passes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/tdd/SKILL.md
status: active
revision: 4
---

# Write the test before the implementation
Write the test first. Watch it fail. Write minimal code to pass.
If you did not watch the test fail, you do not know whether it tests the right thing.
Violating the letter of the rules is violating the spirit of the rules.
Use it for new features, bug fixes, refactoring, and behavior changes.
Ask the human partner before skipping it for a throwaway prototype, generated code, or a configuration file.
The iron law: no production code without a failing test first.
Wrote code before the test? Delete it. Start over. Do not keep it as reference, do not adapt it while writing tests, and do not look at it.
Red: write one minimal test showing what should happen. One behavior, a clear name, and real code, with mocks only when unavoidable.
Verify red: run the test and confirm that it fails, not errors, for the expected reason, because the feature is missing rather than because of a typo.
If the test passes immediately, it tests existing behavior. Fix the test.
Green: write the simplest code to pass the test. Do not add features, refactor other code, or improve beyond the test.
Verify green: the test passes, other tests still pass, and the output is clean.
If the test fails, fix the code, not the test. If another test fails, fix it now.
A green run of the test you wrote is not a green suite. Before calling the change done, run the project's full test command, even when the task named one test file.
A scope statement bounds the deliverable, not your verification. Any failure that run shows, including one you did not cause, goes in the report by name.
Refactor only after green: remove duplication, improve names, and extract helpers. Keep tests green and add no behavior.
When a failing test is impractical because the path needs broad harness setup, brittle mocks, slow end-to-end infrastructure, production-only state, or vague reproduction steps, use the closest executable regression check instead.
Prefer no new test over a bad test. A bad test tests mostly mocks, encodes implementation details, depends on timing or unrelated global state, needs expensive infrastructure for a small fix, or would be deleted right after proving the fix.
Do not change tests to match a wrong implementation. Do not weaken existing assertions unless the expected behavior genuinely changed and the reason is clear.
Report the evidence, not just the outcome: the failing-before check and its failure, the passing-after run, and any nearby validation.
