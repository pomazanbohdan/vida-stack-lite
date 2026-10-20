---
instruction_id: use-the-recorded-state-instead-of-deriving-it
title: Use the recorded state instead of deriving it
summary: The state of a work item has one home; read the recorded value from there instead of deriving one from the surroundings.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A work item's state or status is needed."
conditions_does_not_apply_when: Nothing has been recorded yet and the state has to be set for the first time.
artifact_contract_output_type: recorded-state
artifact_contract_required_data:
  - the recorded state
  - the record it was read from
artifact_contract_verified_by: "the state is the recorded value, not a value derived from the surroundings"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 1
---

# Use the recorded state instead of deriving it
State: `planned`, `backlog`, `in-progress`, `review`, `done`, or `dropped` — what the board groups by and what a tracker sees.
Every `tickets.py` row carries its ticket's `state`; use it rather than deriving it
A leaf's `status`, `blocked_at`, and `blocked_reason` live in its plan, `<type>-<slug>-plan.md` beside where its file is or would be, joined by the plan's `ticket` field; a leaf file's own `status` is read only when there is no plan.
