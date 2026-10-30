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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-mvp-tdd.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the test before the implementation
Write the test first. Watch it fail. Write minimal code to pass.
If you did not watch the test fail, you do not know whether it tests the right thing.
Violating the letter of the rules is violating the spirit of the rules.
Use it for new features, bug fixes, refactoring, and behavior changes.
Ask the human partner before skipping it for a throwaway prototype, generated code, or a configuration file.
The iron law: no production code without a failing test first.
Write code before the test? Delete it.
Start over.
No exceptions.
Don't keep it as "reference".
Don't "adapt" it while writing tests.
Don't look at it.
Delete means delete.
Implement fresh from tests. Period.
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
Code before test is a red flag.
Test after implementation is a red flag.
Test passes immediately is a red flag.
Can't explain why the test failed is a red flag.
Rationalizing "just this once" is a red flag.
All of these mean: delete code and start over with TDD.
Task-scoped enforcement runs inside plan execution, immediately before each implementation step.
For each task gated by TDD, the executor MUST verify (before running the implementation step):
- A failing-test commit exists.
- The test was actually red — INTENTIONALLY.
- No implementation commit yet.
If any check fails, the gate trips.
An `INVALID_RED` verdict, unsupported format, or failed semantic assessment trips this gate; self-attestation cannot substitute for machine validation.
A `RED:` prefix or `(RED)` tag in the commit message is not evidence.
Pure documentation, configuration, or test-only tasks are skipped by this gate even when both modes are active.
The executor MUST halt before running the task's implementation step.
Do NOT roll back any prior commits in the same wave.
Under TDD mode, if any TDD plan is missing a RED or GREEN commit, the executor MUST refuse to mark the phase complete.
