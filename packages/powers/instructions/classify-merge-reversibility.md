---
instruction_id: classify-merge-reversibility
title: Classify merge reversibility
summary: "Classify a change's merge danger as a one-way or two-way door and name its blast radius."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A change is about to be merged and its reversibility matters.
conditions_does_not_apply_when: The change is trivially reversible and low impact.
artifact_contract_output_type: merge-danger
artifact_contract_required_data:
  - door
  - blast radius
artifact_contract_verified_by: the door is stated as one-way or two-way and the blast radius is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/pr/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/phase-planning.md
status: active
revision: 2
---

# Classify merge reversibility
Describe whether it's a one-way or two-way door. You can walk back through two-way doors, but not one-way doors. A PR that is cheap to roll back is lower risk. Changes that involve destructive actions or hard-to-reverse decisions are one-way doors.
The blast radius is the potential impact or scope of the changes introduced by this PR. Consider all possibilities. Examples are layout shift, breakages for consumers, mobile responsiveness, etc.
- `reversible` | Undo is local and cheap. | None. This is the default when no rating is given.
- `costly` | Undo touches many call sites or needs a coordinated change. | Flagged in the plan so the reader sees the weight. Never blocks.
- `one-way` | Undo requires a migration, breaks a published contract, or is impossible. | The planner inserts a `checkpoint:decision` immediately **before** the dependent task, unless the human already settled that decision.
- prefer *removing* irreversibility over gating it
MUST support an optional `<reversibility rating="reversible|costly|one-way">` element recording how costly a decision would be to undo
MUST insert a `checkpoint:decision` before the task implementing a `one-way` decision
`costly` is flagged without blocking; `reversible` and unrated flow normally
