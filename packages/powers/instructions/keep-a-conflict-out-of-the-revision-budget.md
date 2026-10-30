---
instruction_id: keep-a-conflict-out-of-the-revision-budget
title: Keep a conflict out of the revision budget
summary: "A conflict return is not a failed attempt: it consumes no revision iteration, and it is bounded twice — by the repeat of one property and by the total number of conflicts."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: The producing agent reports that it cannot apply a suggestion without breaking a constraint.
conditions_does_not_apply_when: The agent addressed the finding.
artifact_contract_output_type: conflict-budget
artifact_contract_required_data:
  - the conflict
  - the repetition count
  - the total conflict count
artifact_contract_verified_by: the conflict consumed no revision iteration and the conflict budget was tracked separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep a conflict out of the revision budget
Do NOT increment the iteration counter and do NOT update `prev_issue_count`. Do NOT re-spawn the checker yet — the conflict is not a revised output
A conflict naming the SAME `required_property` twice in a row means the chosen resolution did not take. Stop re-spawning; escalate as a stall
Count every conflict return in this revision loop, whatever property each names. On the THIRD, stop and escalate — an agent that alternates property names never trips the repeat rule, so the repeat rule alone leaves the loop unbounded
A conflict still never consumes a revision iteration — the cap on conflicts is separate from, and additional to, the cap on revisions
