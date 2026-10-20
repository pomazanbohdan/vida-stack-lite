---
instruction_id: diff-the-range-the-review-covers
title: Diff the range the review covers
summary: "Fix the range before the review: the plan baseline, the merge base of a branch, or the named files — untracked files included — and stop when there is nothing to review."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review target is known and the change has to be turned into the diff the review will read.
conditions_does_not_apply_when: The diff is already staged and the range it covers is already fixed.
artifact_contract_output_type: review-diff
artifact_contract_required_data:
  - the diff source
  - the range the diff covers
  - the diff file
artifact_contract_verified_by: "the diff covers the whole range including untracked files, and an empty diff stops the run"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 1
---

# Diff the range the review covers
A plan baseline diffs every change since `baseline_revision`, untracked files included.
A branch diff runs from the merge-base (`<base>...HEAD`), so later commits on the base do not show up as reverted.
For a file list, include untracked files.
If the source does not resolve, HALT and ask for a valid one; if the diff is empty, HALT — there is nothing to review.
If `{diff_file}` exceeds about 3000 lines, warn the user and offer to chunk the review by file group. If they accept, agree on the first group, rebuild `{diff_file}` for it, and list the remaining groups for follow-up runs.
