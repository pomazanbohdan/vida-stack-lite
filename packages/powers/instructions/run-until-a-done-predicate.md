---
instruction_id: run-until-a-done-predicate
title: Run until a done predicate
summary: "State the exit condition as a checkable predicate, then drive to it without stopping, discarding changes that did not move it."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "A long task must run to completion without stopping, such as a run until done or a loop until a condition."
conditions_does_not_apply_when: The work is a single answered question or a change one iteration settles.
artifact_contract_output_type: completion-loop
artifact_contract_required_data:
  - exit condition
  - iterations run
  - what landed
  - what was discarded
  - final predicate state
artifact_contract_verified_by: the done condition executed with a passing result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/02-poteto-mode.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/07-overnight.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/babysit.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autonomous-run.md
status: active
revision: 1
---

# Run until a done predicate
State the exit condition as a checkable predicate before the first iteration: tests green, repro fixed, all N PRs merged, pixel-diff zero.
A duration is not a finish condition; work on this for four hours gives the agent nothing to check.
Give the loop a predicate that can pass or fail.
Pick the wake mechanism: an event to watch gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback.
No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.
Each iteration makes the smallest change the evidence justifies, verifies it against the predicate, commits if it advanced, and discards changes that didn't help.
Belt-and-suspenders that might help gets reverted, not left to ride.
Sequence the work into verifiable units, verifying each unit before the next instead of batching checks at the end.
Checkpoint every iteration, a row for what changed and whether the predicate moved.
Mid-run discoveries are yours: fix broken skills, related bugs, flaky verifiers, review noise, tooling failures, orphaned follow-ups, and fixable drift yourself.
Put out-of-band fixes in their own PR.
Do not park reversible work for the human.
Surface only irreversible actions, genuine product or preference calls no experiment can settle, or a real dead end.
Stop when the predicate is met.
A plateau is not a stop, so keep going and pivot your approach to push past it.
Surface a genuine dead end rather than spinning.
Never relax the predicate to declare victory.
The escape hatch lets the run stop at a genuine dead end and write up why, which beats eight hours of creative goal reinterpretation.
Reply with the exit condition, iterations run, what landed, what was discarded, and the final predicate state.
