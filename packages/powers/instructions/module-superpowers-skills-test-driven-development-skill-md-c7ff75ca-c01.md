---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-test-driven-development-skill-md-c7ff75ca-c01"
title: "superpowers: skills/test-driven-development/SKILL.md module"
summary: "Carrier for 2 atomic instructions from superpowers:skills/test-driven-development/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/test-driven-development/SKILL.md\"}"
atom_ids:
  - simplify-design-when-tests-are-hard
  - test-first-development
atom_count: 2
atoms: "[{\"atom_id\":\"simplify-design-when-tests-are-hard\",\"file_sha256\":\"e5f8407269f19747d1d8dfaf7411d57487482095a333d23cc901fe8272922228\",\"content_sha256\":\"da73d4c9743534fb398278b28f628ec0c01738d08c995d1bd6c0d8904b6afbd8\",\"file_bytes\":1878,\"body_bytes\":766},{\"atom_id\":\"test-first-development\",\"file_sha256\":\"ba6d710c0864a36ea5a3a51311c89c35d0f07383d460f0724cc56d30b5055a09\",\"content_sha256\":\"2742a9b00e132bb4d08e1de49793a2b3b25e6bec524286a08a2b39edd9f97bb6\",\"file_bytes\":5490,\"body_bytes\":4066}]"
carrier_sha256: df1411dc6d6dc1d92fa32d129199d379d0a5219e33b89915125463ca76e684af
carrier_bytes: 7597
revision: 1
status: active
---
<!-- vpmodule:atom:begin simplify-design-when-tests-are-hard -->
---
instruction_id: simplify-design-when-tests-are-hard
title: Simplify the design when the test becomes hard
summary: "When a test needs heavy setup or constant mocking, treat that as a design signal: simplify the interface instead of complicating the test."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "The test needs many substitutions, a large setup, or cannot be formulated."
conditions_does_not_apply_when: The complexity comes from an external format that will not change.
artifact_contract_output_type: simplified-design
artifact_contract_required_data:
  - source of complexity
  - interface change
  - verification
artifact_contract_verified_by: the test becomes writable without hidden setup
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/test-driven-development/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Simplify the design when the test becomes hard
Don't know how to test? Write the wished-for API.
Write the assertion first.
Ask your human partner.
Test too complicated? Design too complicated.
Simplify the interface.
Must mock everything? Code too coupled.
Use dependency injection.
Test setup huge? Extract helpers.
Still complex? Simplify design.
Test hard equals design unclear.
Listen to the test.
Hard to test equals hard to use.
Hard to test? Fix the design, not the test.
When writing or changing any test, name the production change that would make the test fail before writing it.
Assert on real behavior, never on mock behavior.
Keep test-only code in test utilities, out of production classes.
Understand a dependency's side effects before mocking it.
<!-- vpmodule:atom:end simplify-design-when-tests-are-hard -->
<!-- vpmodule:atom:begin test-first-development -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/test-driven-development/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/tdd/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-mvp-tdd.md
status: active
revision: 8
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
A GREEN commit counts only when it descends from a RED commit of the same plan; commit order is ancestry, not log position or commit date. A plan with both kinds but no GREEN after a RED is a `green_before_red` violation. If git cannot answer the ancestry question, keep the GREEN's credit rather than inventing a violation.
<!-- vpmodule:atom:end test-first-development -->