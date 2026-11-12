---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-testing-patterns-md-4fcfee8b-c01"
title: "addy-skills: references/testing-patterns.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:references/testing-patterns.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/testing-patterns.md\"}"
atom_ids:
  - assert-specific-values-instead-of-snapshots
  - name-tests-by-unit-behaviour-and-condition
  - never-skip-or-silence-a-failing-test
  - query-elements-by-role-not-test-id
  - structure-each-test-as-arrange-act-assert
atom_count: 5
atoms: "[{\"atom_id\":\"assert-specific-values-instead-of-snapshots\",\"file_sha256\":\"174b308e1d265c8eefe3c28185aa451abb3b7105e9f540f4c525712288e481ac\",\"content_sha256\":\"0c56a7fbd90c95756569a79d602eea41d859997b28a2c91e0f22f26db448ea94\",\"file_bytes\":1222,\"body_bytes\":189},{\"atom_id\":\"name-tests-by-unit-behaviour-and-condition\",\"file_sha256\":\"a7e2299a1d5a01121ff3c9cd3b9d5ffd6c4158951a8f55af31395f49c851b7a1\",\"content_sha256\":\"59a4e5f06ac0cf6a36dba5e96f20b2cf4fbc4d7ecf599e1db8ed377e1f9528a4\",\"file_bytes\":1328,\"body_bytes\":370},{\"atom_id\":\"never-skip-or-silence-a-failing-test\",\"file_sha256\":\"d2a2ae3bc2b6b8237c9e47d5bb7865b353b9c264e1b58b9a00e5c87f3a89a6ae\",\"content_sha256\":\"3e10512e0cb6e0de1050d436f5c66852f29efd71d94f643468af82940d13c063\",\"file_bytes\":1602,\"body_bytes\":255},{\"atom_id\":\"query-elements-by-role-not-test-id\",\"file_sha256\":\"a1b9a738f9bbecb65761836c805866ffa648b1ded419f4d49117dcf825a5ecae\",\"content_sha256\":\"da0d58e2665c154d0a5365724a6a8bdc6f6c298f172e68618270a0dd011f5519\",\"file_bytes\":1431,\"body_bytes\":411},{\"atom_id\":\"structure-each-test-as-arrange-act-assert\",\"file_sha256\":\"1100b3e6780e880b154b9b03afca974ef4b3a581521c0491d138d1f72fd87dd3\",\"content_sha256\":\"09a968831ab9cd8b80df6990b3fc6db95b01662a113f72335770e09e64e1f67b\",\"file_bytes\":1306,\"body_bytes\":228}]"
carrier_sha256: 811c63ca86a5270493e8089418e936b8fed6b0890d80d1243ecd9ff84fed147b
carrier_bytes: 7570
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-specific-values-instead-of-snapshots -->
---
instruction_id: assert-specific-values-instead-of-snapshots
title: Assert specific values instead of snapshots
summary: "A snapshot nobody reviews proves nothing, and an assertion that accepts anything catches no regression."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "An assertion is written, or a snapshot is introduced."
conditions_does_not_apply_when: The work adds no assertion.
artifact_contract_output_type: assertion-review
artifact_contract_required_data:
  - the value asserted
  - the regression it would catch
artifact_contract_verified_by: every assertion names the specific value it expects and no snapshot stands in for it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Assert specific values instead of snapshots
Snapshot everything | No one reviews snapshot diffs | Assert specific values
Overly broad assertions | Doesn't catch regressions | Be specific
<!-- vpmodule:atom:end assert-specific-values-instead-of-snapshots -->
<!-- vpmodule:atom:begin name-tests-by-unit-behaviour-and-condition -->
---
instruction_id: name-tests-by-unit-behaviour-and-condition
title: "Name tests by unit, behaviour and condition"
summary: "A test name states the unit, the expected behaviour and the condition that produces it."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is named.
conditions_does_not_apply_when: The work adds no test.
artifact_contract_output_type: test-name-review
artifact_contract_required_data:
  - the unit
  - the expected behaviour
  - the condition
artifact_contract_verified_by: "every test name can be read as unit, expected behaviour and condition"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name tests by unit, behaviour and condition
// Pattern: [unit] [expected behavior] [condition]
describe('TaskService.createTask', () => {
  it('creates a task with default pending status', () => {});
  it('throws ValidationError when title is empty', () => {});
  it('trims whitespace from title', () => {});
  it('generates a unique ID for each task', () => {});
});
<!-- vpmodule:atom:end name-tests-by-unit-behaviour-and-condition -->
<!-- vpmodule:atom:begin never-skip-or-silence-a-failing-test -->
---
instruction_id: never-skip-or-silence-a-failing-test
title: Never skip or silence a failing test
summary: "A skipped test and an unawaited assertion both hide a real bug, so the test is fixed or deleted rather than silenced."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
  - failing-test-policy
conditions_applies_when: "A test fails, is skipped, or ends without its assertion being awaited."
conditions_does_not_apply_when: The suite is green and no test is skipped.
artifact_contract_output_type: test-silence-review
artifact_contract_required_data:
  - the skipped or unawaited test
  - the reason it was silenced
  - what happens to the test now
artifact_contract_verified_by: "no test is skipped and every asynchronous assertion is awaited, so a rejection fails the test"
compatibility_excludes:
  - decide-whether-the-test-the-harness-or-the-application-is-wrong
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never skip or silence a failing test
Skipping tests to pass CI | Hides real bugs | Fix or delete the test
Using `test.skip` permanently | Dead code | Remove or fix it
No async error handling | Swallowed errors, false passes | Always `await` async tests
<!-- vpmodule:atom:end never-skip-or-silence-a-failing-test -->
<!-- vpmodule:atom:begin query-elements-by-role-not-test-id -->
---
instruction_id: query-elements-by-role-not-test-id
title: "Query elements by role and label, not by test id"
summary: "An element is located by its accessible role and name, so the test survives a change of the internal markup."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test drives a user interface.
conditions_does_not_apply_when: The test touches no user interface.
artifact_contract_output_type: element-query-review
artifact_contract_required_data:
  - the element
  - the role and accessible name used to find it
artifact_contract_verified_by: no element is located by a test id or by a generated class
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Query elements by role and label, not by test id
Find elements by accessible role/label (not test IDs).
```
await screen.findByRole('textbox', { name: /title/i });
await page.getByRole('button', { name: /log in/i }).click();
```
A role that takes its name from content (`listitem`, `generic`) has no accessible name; filter by text instead: `page.getByRole('listitem').filter({ hasText: /buy groceries/i })`.
<!-- vpmodule:atom:end query-elements-by-role-not-test-id -->
<!-- vpmodule:atom:begin structure-each-test-as-arrange-act-assert -->
---
instruction_id: structure-each-test-as-arrange-act-assert
title: "Structure each test as arrange, act, assert"
summary: "A test sets up its own data and preconditions, performs the one action under test, and asserts the outcome, with no state shared with other tests."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is written or rewritten.
conditions_does_not_apply_when: The work adds no test.
artifact_contract_output_type: test-structure-review
artifact_contract_required_data:
  - the arrange step
  - the act step
  - the assert step
  - the setup and teardown of the test
artifact_contract_verified_by: every test shows the three phases and sets up and tears down its own state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Structure each test as arrange, act, assert
Arrange: Set up test data and preconditions
Act: Perform the action being tested
Assert: Verify the outcome
Shared mutable state | Tests pollute each other | Setup/teardown per test
<!-- vpmodule:atom:end structure-each-test-as-arrange-act-assert -->