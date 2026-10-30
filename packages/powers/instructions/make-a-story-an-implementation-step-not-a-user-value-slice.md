---
instruction_id: make-a-story-an-implementation-step-not-a-user-value-slice
title: "Make a story an implementation step, not a user-value slice"
summary: "A story under a container is one implementation step toward that container's done condition, small enough for one agent session; the container, not the story, is the unit of value."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A container of work is broken into items another executor will build.
conditions_does_not_apply_when: The work is a single item with no container above it.
artifact_contract_output_type: story-shape
artifact_contract_required_data:
  - "the step the item takes toward the container's done condition"
  - the session it must fit in
  - the fact that the container is the unit of value
artifact_contract_verified_by: "each item is one implementation step the container's done condition needs"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make a story an implementation step, not a user-value slice
Under an epic a story is an implementation slice sequenced to reach the epic's Done when, not a user-value slice; an enabler, or work a person must do (hitl), is a story
It is one implementation step toward the epic's Done when, small enough that one agent session, starting from the entry, its epic, and the source, plans and finishes it.
It need not be user-visible on its own; the epic is the unit of value.
Too small when setup outweighs the work: merge. An epic that is itself one session's work gets one story.
