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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
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
