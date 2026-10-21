---
instruction_id: mark-a-milestone-only-when-something-shipped
title: Mark a milestone only when something shipped
summary: "A milestone is marked for a release, a shipped feature set or an archive, never for a finished phase or work in progress."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A point in the work could be marked as a milestone.
conditions_does_not_apply_when: Something shipped.
artifact_contract_output_type: milestone-decision
artifact_contract_required_data:
  - the decision
  - the reason in terms of what shipped
artifact_contract_verified_by: the milestone was marked for something shipped and not for a finished phase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 1
---

# Mark a milestone only when something shipped
**Create milestones for:** Initial release, public releases, major feature sets shipped, before archiving planning.
**Don't create milestones for:** Every phase completion (too granular), work in progress, internal dev iterations (unless truly shipped).
Heuristic: "Is this deployed/usable/shipped?" If yes → milestone. If no → keep working.
