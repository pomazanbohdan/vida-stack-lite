---
instruction_id: save-the-attempted-work-as-a-patch-before-reverting
title: Save the attempted work as a patch before reverting
summary: "Before the code changes are reverted, the attempt is saved as a patch file and referenced from the record, so nothing is lost."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The code changes of the pass are about to be reverted.
conditions_does_not_apply_when: Nothing is being reverted.
artifact_contract_output_type: saved-patch
artifact_contract_required_data:
  - the patch file
  - the record that references it
  - the questions that remain open
artifact_contract_verified_by: the patch file exists and the record points at it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 2
---

# Save the attempted work as a patch before reverting
Save the attempted change as a patch file beside the plan and reference it from the triage-log entry, then revert code changes.
Append the triage-log entry for this pass, then HALT with status `blocked`, blocking condition `intent gap`, and include the unresolved questions and the saved patch path.
The patch shows which reading of the intent the run implemented — concrete evidence for repairing the intent.
If the attempted reading turns out to be correct, `git apply` the patch and set the plan status to `in-review` to resume review on it instead of re-running from scratch.
