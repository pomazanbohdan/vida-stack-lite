---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-test-driven-development-skill-md-fe5ea044-c01"
title: "addy-skills: skills/test-driven-development/SKILL.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:skills/test-driven-development/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/test-driven-development/SKILL.md\"}"
atom_ids:
  - discover-the-repositorys-test-tooling
  - do-not-rerun-checks-without-a-change
  - keep-tests-self-contained
  - let-another-agent-write-the-reproduction-test
  - write-one-test-one-behaviour
atom_count: 5
atoms: "[{\"atom_id\":\"discover-the-repositorys-test-tooling\",\"file_sha256\":\"73fbeaa7935fa3dcfa7c4cab63cf31ee9cc2685aff08297f2ab35eb4a50bf005\",\"content_sha256\":\"4f34fac4153051279894d7231b4e4fd9cb70a16920d96d2b323ee9ac477f6786\",\"file_bytes\":3310,\"body_bytes\":1618},{\"atom_id\":\"do-not-rerun-checks-without-a-change\",\"file_sha256\":\"b72bcfbaa73508c37d48bcaa6c0ef98f7dc86339b41b854e1451ba82ef5e1423\",\"content_sha256\":\"38859f4ef78e6ad1964ec42d6bd7d1e9ba38509fa8a539869dff9d6627af31df\",\"file_bytes\":1641,\"body_bytes\":573},{\"atom_id\":\"keep-tests-self-contained\",\"file_sha256\":\"aacea35681257b901f4b8cd29a5eee27269a2b5159f7aa217d8f22754d4f82e7\",\"content_sha256\":\"9b039d78c54b443705b38fdf5609d0dbe6a30818d4b547e72d0f0d076cf6fe46\",\"file_bytes\":2156,\"body_bytes\":1093},{\"atom_id\":\"let-another-agent-write-the-reproduction-test\",\"file_sha256\":\"ad821c0ac5288673d678b413f95f72a2d2dfe72c3314ebebdbda73079fbb389e\",\"content_sha256\":\"23b4b49ea19abfff7089ad4e567bc34b9d28faf438fe192786bba41e476987a0\",\"file_bytes\":1669,\"body_bytes\":536},{\"atom_id\":\"write-one-test-one-behaviour\",\"file_sha256\":\"e9150850caae7ccd777a343eb32750fdaebd4ad44cba81753c420f5baa1574fa\",\"content_sha256\":\"8cc3d45d6771d53e975a87264105f6ccb96abd1d61134e1144883656e6ccc3d9\",\"file_bytes\":2543,\"body_bytes\":1468}]"
carrier_sha256: 1da879136fb079ee613b2e5f2b216c1fb87a1adfaf98b991b7b1a9c6808ea435
carrier_bytes: 11950
revision: 1
status: active
---
<!-- vpmodule:atom:begin discover-the-repositorys-test-tooling -->
---
instruction_id: discover-the-repositorys-test-tooling
title: "Discover the repository's test tooling"
summary: "Find the build system, the checked-in wrappers, the test framework, the conventions and the documented commands before the first test, and use those commands; for end-to-end work, also find the runner, the layout, the app start, the authentication and the CI job of that harness."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: The first test of a repository is about to be written and the local test commands or the end-to-end harness are unknown.
conditions_does_not_apply_when: "The repository's test commands are already known and were used recently."
artifact_contract_output_type: tooling-discovery
artifact_contract_required_data:
  - the dependency file
  - the focused-test command
  - the full-suite command
  - the test conventions
  - "the end-to-end harness: runner, layout, app start, authentication, CI job"
artifact_contract_verified_by: "the focused and the full-suite command come from the repository, not from a default, and the end-to-end runner, layout, app start and CI job come from the repository too"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Discover the repository's test tooling

## Discover the Stack First

The TDD cycle is universal; the commands are not. Before writing the first test, discover how *this* repository tests, and use its commands for every RED, GREEN, and verification step:

- **Language and build system** — `package.json`, `pom.xml`/`build.gradle`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, a `Makefile`
- **Checked-in wrappers** — prefer `./gradlew`, `./mvnw`, `make test`, or a repo script over globally installed tools
- **Test framework and configuration** — and how it runs a single focused test vs the full suite
- **Existing conventions** — where tests live, how files are named, what patterns neighboring tests follow
- **Documented commands** — README, CONTRIBUTING, and CI workflows show the commands that actually gate merges

Run the repository's focused-test command during the loop and its full-suite command before completion. Never assume a default like `npm test` — a Gradle, Cargo, or pytest project has its own equivalent.

## End-to-end and API tests

Read how this project already tests end to end before writing anything: the runner and its config, where end-to-end and API tests live and how they are named, how the app is started for a test run (dev server, containers, test database, fixtures and seeding), how tests authenticate, and the CI job that runs them. Look at whatever the project's ecosystem uses to declare dependencies and tasks, not only `package.json`.

## Red Flags

- Reaching for a default test command (`npm test`) without checking what this repository actually uses
<!-- vpmodule:atom:end discover-the-repositorys-test-tooling -->
<!-- vpmodule:atom:begin do-not-rerun-checks-without-a-change -->
---
instruction_id: do-not-rerun-checks-without-a-change
title: Do not rerun checks without a change
summary: Run a check once after the change that could affect it; repeating the same command on unchanged code adds no confidence.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check has just passed and the temptation is to run it again.
conditions_does_not_apply_when: The code changed since the last run of the same check.
artifact_contract_output_type: check-run
artifact_contract_required_data:
  - the command
  - the change it was run after
  - the result
artifact_contract_verified_by: every run follows a change that could affect the result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not rerun checks without a change
Run each test command after a change that could affect the result. After a clean run, don't repeat the same command unless the code has changed since — re-running on unchanged code adds no confidence.

## Red Flags

- Running the same test command twice in a row without any intervening code change

## Common Rationalizations

"Let me run the tests again just to be extra sure"
After a clean test run, repeating the same command adds nothing unless the code has changed since. Run again after subsequent edits, not as reassurance.
<!-- vpmodule:atom:end do-not-rerun-checks-without-a-change -->
<!-- vpmodule:atom:begin keep-tests-self-contained -->
---
instruction_id: keep-tests-self-contained
title: Keep tests self-contained
summary: "Prefer duplication over shared helpers in tests, and let every test set up and tear down its own state."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test is written or refactored and shared setup is being considered.
conditions_does_not_apply_when: The helper is part of the production code under test.
artifact_contract_output_type: self-contained-test
artifact_contract_required_data:
  - "the test's own setup"
  - the state it creates
  - the state it removes
artifact_contract_verified_by: the test passes on its own and leaves no state behind for the next test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep tests self-contained

### DAMP Over DRY in Tests

In production code, DRY (Don't Repeat Yourself) is usually right. In tests, **DAMP (Descriptive And Meaningful Phrases)** is better. A test should read like a specification — each test should tell a complete story without requiring the reader to trace through shared helpers.

```typescript
// DAMP: Each test is self-contained and readable
it('rejects tasks with empty titles', () => {
  const input = { title: '', assignee: 'user-1' };
  expect(() => createTask(input)).toThrow('Title is required');
});

it('trims whitespace from titles', () => {
  const input = { title: '  Buy groceries  ', assignee: 'user-1' };
  const task = createTask(input);
  expect(task.title).toBe('Buy groceries');
});

// Over-DRY: Shared setup obscures what each test actually verifies
// (Don't do this just to avoid repeating the input shape)
```

Duplication in tests is acceptable when it makes each test independently understandable.

### No test isolation
Tests pass individually but fail together
Each test sets up and tears down its own state
<!-- vpmodule:atom:end keep-tests-self-contained -->
<!-- vpmodule:atom:begin let-another-agent-write-the-reproduction-test -->
---
instruction_id: let-another-agent-write-the-reproduction-test
title: Let another agent write the reproduction test
summary: "For a complex bug, hand the reproduction test to another agent that does not know the fix, then verify that it fails before the fix is written."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A complex bug needs a reproduction test and the fix is already known to the main agent.
conditions_does_not_apply_when: "The bug is trivial, or the fix is not yet known."
artifact_contract_output_type: delegated-reproduction
artifact_contract_required_data:
  - the bug description
  - the delegated test
  - the failing run
artifact_contract_verified_by: the delegated test failed against the unfixed code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Let another agent write the reproduction test

## When to Use Subagents for Testing

For complex bug fixes, spawn a subagent to write the reproduction test:

```
Main agent: "Spawn a subagent to write a test that reproduces this bug:
[bug description]. The test should fail with the current code."

Subagent: Writes the reproduction test

Main agent: Verifies the test fails, then implements the fix,
then verifies the test passes.
```

This separation ensures the test is written without knowledge of the fix, making it more robust.
<!-- vpmodule:atom:end let-another-agent-write-the-reproduction-test -->
<!-- vpmodule:atom:begin write-one-test-one-behaviour -->
---
instruction_id: write-one-test-one-behaviour
title: "Write one test, one behaviour"
summary: "Give each test a descriptive name, one behaviour and the arrange, act, assert shape, so it reads like a specification."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "A test body is written, or the name of a test is chosen."
conditions_does_not_apply_when: The test is a shared fixture or a setup helper.
artifact_contract_output_type: readable-test
artifact_contract_required_data:
  - the test name
  - the behaviour it checks
  - "the arrange, act and assert phases"
artifact_contract_verified_by: the name states the expected behaviour and the test checks one behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write one test, one behaviour

### Use the Arrange-Act-Assert Pattern

```typescript
it('marks overdue tasks when deadline has passed', () => {
  // Arrange: Set up the test scenario
  const task = createTask({
    title: 'Test',
    deadline: new Date('2025-01-01'),
  });

  // Act: Perform the action being tested
  const result = checkOverdue(task, new Date('2025-01-02'));

  // Assert: Verify the outcome
  expect(result.isOverdue).toBe(true);
});
```

### One Assertion Per Concept

```typescript
// Good: Each test verifies one behavior
it('rejects empty titles', () => { ... });
it('trims whitespace from titles', () => { ... });
it('enforces maximum title length', () => { ... });

// Bad: Everything in one test
it('validates titles correctly', () => {
  expect(() => createTask({ title: '' })).toThrow();
  expect(createTask({ title: '  hello  ' }).title).toBe('hello');
  expect(() => createTask({ title: 'a'.repeat(256) })).toThrow();
});
```

### Name Tests Descriptively

```typescript
// Good: Reads like a specification
describe('TaskService.completeTask', () => {
  it('sets status to completed and records timestamp', ...);
  it('throws NotFoundError for non-existent task', ...);
  it('is idempotent — completing an already-completed task is a no-op', ...);
  it('sends notification to task assignee', ...);
});

// Bad: Vague names
describe('TaskService', () => {
  it('works', ...);
  it('handles errors', ...);
  it('test 3', ...);
});
```
<!-- vpmodule:atom:end write-one-test-one-behaviour -->