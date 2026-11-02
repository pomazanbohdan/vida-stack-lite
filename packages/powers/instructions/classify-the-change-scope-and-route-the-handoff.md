---
instruction_id: classify-the-change-scope-and-route-the-handoff
title: Classify the change scope and route the handoff
summary: "Route the change to spec, re-slice, or drop, name the tickets and entries each touches, and say whether what is required changed or only how it is delivered."
capability_tags:
  - assess-change-impact
pattern_tags:
  - scope-routing
conditions_applies_when: An approved change is about to be handed to whoever will carry it out.
conditions_does_not_apply_when: Nobody else carries the change out; the current session finishes it.
artifact_contract_output_type: handoff
artifact_contract_required_data:
  - the scope grade
  - "the items added, removed, resequenced or rescoped"
  - the recipients
  - the responsibilities
  - the success criteria
artifact_contract_verified_by: the scope grade decides the recipients and the success criteria are written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify the change scope and route the handoff
Classify what changed:
- **Required change** — the ticket's Requirements or Constraints change. Run `spec.md` on the ticket with the change as input; its lines re-render with ids kept.
- **Delivery change** — what is required stands; only the split, order, or scope of remaining entries changes. Re-slice each affected epic per `slice.md`.
- **Obsolete work** — a ticket or entry no longer belongs. Drop it per `board.md` and clear what waited on it.
Name the tickets, entries, and companions each route touches, and who owns the next action. An in-progress ticket asks whether its build stops; never edit its plan.
