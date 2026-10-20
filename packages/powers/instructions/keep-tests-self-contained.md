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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
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
