---
instruction_id: keep-the-decision-record-even-when-the-gate-is-suppressed
title: Keep the decision record even when the gate is suppressed
summary: "Suppressing the stop before a door removes the gate, never the record that the door was walked through."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run suppresses the checkpoint that guards a costly decision.
conditions_does_not_apply_when: The run stops at the checkpoint.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - the rating recorded on the task
  - the state of the frontmatter
artifact_contract_verified_by: the rating is still recorded and the frontmatter matches the presence of a checkpoint
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reversibility.md
status: active
revision: 1
---

# Keep the decision record even when the gate is suppressed
It suppresses **checkpoint insertion only**. Ratings are still recorded on tasks, and `costly` items are still flagged. The signal a future phase needs is independent of whether this particular run wanted to stop for it — an unattended run should not silently erase the record of which doors it walked through.
the signal survives in the plan after the checkpoint is resolved
Any plan containing a checkpoint must set `autonomous: false` in frontmatter — inserting a reversibility gate flips a previously-autonomous plan, so update the frontmatter in the same pass
