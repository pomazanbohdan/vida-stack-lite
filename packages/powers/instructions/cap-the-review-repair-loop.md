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
status: active
revision: 1
---

# Cap the review repair loop
Before each plan-defect loopback, read the review loop counter from the plan frontmatter (missing means `0`), increment it by 1, and write it back.
If it exceeds 5, append the triage-log entry for this pass, then HALT with status `blocked` and blocking condition `review repair loop exceeded 5 iterations (non-convergence)`.
