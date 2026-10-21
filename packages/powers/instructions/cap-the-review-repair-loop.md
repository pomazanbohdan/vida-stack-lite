---
instruction_id: cap-the-review-repair-loop
title: Cap the review repair loop
summary: The repair loop counts its iterations and stops at the cap instead of grinding; a run that does not converge is reported as blocked.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A review finding sends the work back into the plan.
conditions_does_not_apply_when: The review produced no finding that sends the work back.
artifact_contract_output_type: repair-loop-record
artifact_contract_required_data:
  - the iteration count
  - the cap
  - the pass that was recorded when the cap was reached
artifact_contract_verified_by: the loop stopped at the cap and the pass was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/gates.md
status: active
revision: 2
---

# Cap the review repair loop
Before each plan-defect loopback, read the review loop counter from the plan frontmatter (missing means `0`), increment it by 1, and write it back.
If it exceeds 5, append the triage-log entry for this pass, then HALT with status `blocked` and blocking condition `review repair loop exceeded 5 iterations (non-convergence)`.
Max revision iterations reached. Remaining issues:
If the researcher returns `## REVISION_CONFLICT`: do NOT increment `revision_count` and do NOT re-spawn the checker — a conflict is not resolvable by re-running the same loop.
Present the conflict and its alternatives to the user and ask which to take: adopt a named alternative / override the named constraint and apply the hint / amend the constraint itself.
Every option resolves the conflict — accepting the spec with the BLOCK still open is NOT offered here, because the blocking `required_property` still fails; that choice belongs to the cap escalation below.
a conflict naming the SAME `required_property` twice in a row (no successful revision in between) is a stall, and so is the THIRD conflict return of this loop whatever property it names
Stop re-spawning and route it to the same cap escalation below, so declining to spend an iteration cannot make this path unbounded.
`required_property` + evidence + severity BIND. `fix_hint` is ONE non-binding example route: a smaller or different mechanism reaching the same property resolves the issue in full — say which you used.
Do NOT replan from scratch unless issues are fundamental.
The cap should reflect the cost of each iteration -- expensive operations get fewer retries.
The loop also escalates early if issue count does not decrease between consecutive iterations (stall detection).
After max iterations, escalates unconditionally.
