---
instruction_id: mark-waiting-on-a-person-as-blocked-with-a-reason
title: "Mark waiting on a person as blocked, with a reason"
summary: "An item that waits for a person or an answer — not for a prerequisite — is marked blocked with the reason and the date it started waiting, and the reason is cleared when it moves."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A work item waits for a person or an answer rather than for a prerequisite.
conditions_does_not_apply_when: The item waits for another item to finish.
artifact_contract_output_type: blocked-record
artifact_contract_required_data:
  - the reason the item waits
  - the date it started waiting
  - the status it keeps while it waits
artifact_contract_verified_by: "the item carries a blocked reason and a date, and the reason is cleared when it moves"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 1
---

# Mark waiting on a person as blocked, with a reason
Waiting on a person or an answer, not on a prerequisite,
`--blocked <reason>` sets `blocked_at` (today) and `blocked_reason`
a `mark` without it clears both when the ticket moves
