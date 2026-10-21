---
instruction_id: make-operations-idempotent
title: Make operations idempotent
summary: Design operations so they converge to the correct state regardless of how many times they run or where the previous run stopped.
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: "The operation can be run again manually, after a crash, or in several processes."
conditions_does_not_apply_when: The action is guaranteed to run once and has no repeats.
artifact_contract_output_type: idempotent-operation
artifact_contract_required_data:
  - first run
  - repeat run
  - operation key
  - partial completion
artifact_contract_verified_by: two consecutive runs producing the same final state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-make-operations-idempotent/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
---

# Make operations idempotent
Design operations so they converge to the correct state regardless of how many times they run or where the previous run stopped.
Commands, lifecycle operations, and processing loops run where crashes, restarts, and retries are normal.
If partial state changes the next run's outcome, every restart becomes a debugging session.
Derive each step from the state that exists, not from what the previous run meant to do.
Read the current state, compare it to the goal, and apply only the difference.
A step written this way is safe to repeat, because a repeat finds nothing left to do.
Anything a run leaves behind, such as a lock, a temporary file, a half-written record, or a claimed job, must be recognizable as stale by the next run.
Judge staleness by evidence that stays true wherever the previous run could have stopped, not only in the common case.
A marker that the next run cannot judge turns every crash into manual cleanup.
Write to a temporary path and rename it into place, or compare artifacts by content instead of by creation order.
The test:
What happens if this runs twice in a row?
What happens if the previous run crashed at every possible point?
Does re-execution converge to the same end state?
If any answer is "it depends on what state was left behind," the operation needs a reconciliation step.
- Every write to the state file uses a lockfile with `O_EXCL` atomic creation. This prevents the read-modify-write race where two agents each read the file, modify different fields, and the later writer overwrites the earlier one's changes.
