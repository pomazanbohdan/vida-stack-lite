---
instruction_id: re-read-the-constraints-before-you-edit
title: Re-read the constraints before you edit
summary: "A suggestion that contradicts a locked decision or an existing constraint is reported as a conflict, not applied and not worked around."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A revision is about to be applied to an existing plan.
conditions_does_not_apply_when: The plan has no locked decision or constraint behind it.
artifact_contract_output_type: constraint-recheck
artifact_contract_required_data:
  - the constraints in force
  - the conflict
  - the issues that were applied anyway
artifact_contract_verified_by: the conflict was reported and no constraint was broken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
status: active
revision: 1
---

# Re-read the constraints before you edit
Before editing, re-read the constraints already in force
Constraints the existing plans already encode (chosen mechanism, scope boundary, must_haves)
A `fix_hint` conflicts when applying it would contradict any of those. Applying it anyway is a contract violation, not a judgement call. When a hint conflicts — or when the property is unreachable without breaking a constraint — do NOT edit around it and do NOT burn a revision iteration on it
apply every non-conflicting issue normally, and return.
A hint that merely proposes a *bigger* mechanism than needed is not a conflict. Take the smaller route under Step 2 and report it as addressed.
