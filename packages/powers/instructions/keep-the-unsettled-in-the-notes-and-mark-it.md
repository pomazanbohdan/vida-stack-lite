---
instruction_id: keep-the-unsettled-in-the-notes-and-mark-it
title: Keep the unsettled in the notes and mark it
summary: "A gap becomes an open question and a choice becomes a marked assumption, in the notes of the item, and never a silent guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A work item is being drafted and something is still unsettled.
conditions_does_not_apply_when: Everything the item depends on is already settled and recorded.
artifact_contract_output_type: marked-notes
artifact_contract_required_data:
  - each gap marked as an open question
  - each choice marked as an assumption
  - the decision that closes it
artifact_contract_verified_by: no gap and no choice is left unmarked or resolved by guessing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the unsettled in the notes and mark it
Gaps become open questions in Notes and choices become marked assumptions, never silent guesses.
Notes holds what is not in the repo or the source and what is unsettled, each line marked, and only what is local to this ticket.
Anything touching more than one ticket lives in the parent's Notes and is referenced
`Assumption:` — offer each; confirmed, it becomes a dated decision; corrected, the ticket changes.
`Open question:` — answering it is part of the ticket's work when it starts.
`Unknown:` — it gates the start, and `tickets.py next` lists the ticket under `blocked` while the line is there; settle it with the user before the build begins, as a dated decision.
Never resolve any of them by guessing.
When something must be settled before implementation, the skill asks you to answer it or records it as the entry's `unknown`.
It adds a spike when you ask for one.
