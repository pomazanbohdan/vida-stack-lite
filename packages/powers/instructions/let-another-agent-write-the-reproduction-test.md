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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
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
