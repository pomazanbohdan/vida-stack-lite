---
instruction_id: reproduce-defect-before-fixing
title: Reproduce the defect before fixing it
summary: Get a stable reproduction and a failing test before changing code; every shipped line traces to runtime evidence.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: There is a defect report or observed incorrect behavior.
conditions_does_not_apply_when: "A new capability is needed, not a fix to existing behavior."
artifact_contract_output_type: reproduction
artifact_contract_required_data:
  - minimal input
  - expected result
  - actual result
  - test
artifact_contract_verified_by: the reproduction test failing before the fix and passing after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/bug-fix.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/SKILL.md
status: active
revision: 1
---

# Reproduce the defect before fixing it
You own the task: plan, review, verify.
Be scientific: every shipped line traces to runtime evidence.
Belt-and-suspenders that "might help" is a hypothesis, not a fix; it does not ship.
When evidence refutes a hypothesis, revert what it motivated.
The smallest change the evidence justifies ships, nothing more.
Reproduce it yourself on the matching surface.
Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes.
If it will not reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
Binary-search the cause: form the candidate hypotheses, then rule them out until one survives.
Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate.
When program state is unclear, add instrumentation or logging and read it as the code runs.
Do not guess.
Confirm the surviving mechanism with runtime evidence before planning the fix.
Plan the fix; if it crosses a function boundary, design the shape first.
Verify on the same surface: the original reproduction now passes.
"Inconclusive" or wrong-surface is not a pass; flag it.
Unit tests show branch behavior, not bug absence.
Stage the commits so the failing reproduction lands before the fix in history.
Skip the failing-test-first cadence when the test would be expensive, integration-heavy, or unclear.
Paste the failing-then-passing reproduction output verbatim.
