---
instruction_id: scope-a-review-to-the-commits-that-belong-to-the-task
title: Scope a review to the commits that belong to the task
summary: "The files under review are the union of the commits that name the task on this branch, with the planning artifacts and the lockfiles excluded; a commit range would fold in the unrelated work interleaved in the same window."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is scoped to the work a single task produced.
conditions_does_not_apply_when: The review covers the whole branch or the whole repository.
artifact_contract_output_type: review-scope
artifact_contract_required_data:
  - the commits that belong to the task
  - the excluded paths
  - the resulting file list
artifact_contract_verified_by: the scope is the union of the task commits and no unrelated commit is inside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Scope a review to the commits that belong to the task
UNION of the commits naming the quick task id, on THIS branch only
lockfiles excluded
still folds in every unrelated
commit interleaved inside the task's window
the union cannot
No commits for this task => empty scope => skip review
