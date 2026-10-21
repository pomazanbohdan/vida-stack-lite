---
instruction_id: carry-the-lessons-forward-into-the-next-planning-round
title: Carry the lessons forward into the next planning round
summary: "The retrospective is a living document whose lessons feed the next planning round, and the lessons that held across milestones are marked."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - decision-trail
conditions_applies_when: A milestone has been closed.
conditions_does_not_apply_when: The retrospective has already been updated for this milestone.
artifact_contract_output_type: retrospective-lessons
artifact_contract_required_data:
  - the lessons of this milestone
  - the lessons confirmed across milestones
artifact_contract_verified_by: the lessons are written and the cross-milestone ones are marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/retrospective.md
status: active
revision: 1
---

# Carry the lessons forward into the next planning round
A living document updated after each milestone. Lessons feed forward into future planning.
### Key Lessons 1. {Specific, actionable lesson} 2. {Another lesson}
### Top Lessons (Verified Across Milestones) 1. {Lesson verified by multiple milestones}
