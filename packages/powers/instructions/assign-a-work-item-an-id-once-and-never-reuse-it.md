---
instruction_id: assign-a-work-item-an-id-once-and-never-reuse-it
title: Assign a work item an id once and never reuse it
summary: "An item's id is assigned once, is its only name, and is never given to another item — not even after the item is dropped or moved."
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: "A work item is created, moved, or dropped."
conditions_does_not_apply_when: The item already has its id and keeps it.
artifact_contract_output_type: work-item-identity
artifact_contract_required_data:
  - the id
  - the scope the id is unique in
  - the fact that the id is never given out again
artifact_contract_verified_by: the id is assigned once and no other item is ever given it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Assign a work item an id once and never reuse it
An entry's `id` is a number (or letters and digits, such as `6a`, when the work already has that id), assigned once and never reused
It is the ticket's only name on the repo store: `3` inside its epic, `2.3` from another epic.
An entry is never deleted from an approved `tickets.toml`, so its id is never reused.
That field joins the plan to its entry, so a title change that renames the plan never breaks the link.
