---
instruction_id: wait-for-conditions-not-time
title: "Wait for the condition, not for time"
summary: "Replace arbitrary sleeps with polling for the condition you care about, keeping fresh state, a bounded timeout, and a clear error."
capability_tags:
  - write-tests-first
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test waits for an asynchronous result, uses an arbitrary pause, or passes inconsistently."
conditions_does_not_apply_when: The test checks the duration of an interval and the pause is the subject of the check.
artifact_contract_output_type: deterministic-wait
artifact_contract_required_data:
  - expected condition
  - wait boundary
  - error after the boundary
  - justification for any pause
artifact_contract_verified_by: repeated runs of the test under load pass consistently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/condition-based-waiting.md
status: active
revision: 1
---

# Wait for the condition, not for time
Wait for the actual condition you care about, not a guess about how long it takes.
Flaky tests often guess at timing with arbitrary delays.
Arbitrary delays create race conditions where tests pass on fast machines but fail under load or in CI.
Replace arbitrary delays with condition polling.
Wait for an event.
Wait for state.
Wait for a count.
Wait for a file.
Wait for a complex condition.
Call the getter inside the loop for fresh data.
Do not cache state before the loop.
Poll every 10ms; polling too fast wastes CPU.
Always include a timeout with a clear error.
A loop without a timeout runs forever if the condition is never met.
When an arbitrary timeout is correct, first wait for the triggering condition.
Base the timeout on known timing, not guessing.
Explain in a comment why the timeout is needed.
Tests that check actual timing behavior may keep an interval and must document why.
