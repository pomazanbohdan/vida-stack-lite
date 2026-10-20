---
instruction_id: check-the-body-of-work-is-finished-before-the-retro
title: Check the body of work is finished before the retro
summary: The work is checked for unfinished items before the retro starts; the list is put in the document either way and the machine verdict turns on it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: A retrospective starts and the body of work it looks back on may not be finished.
conditions_does_not_apply_when: Every item of the body of work is already known to be finished.
artifact_contract_output_type: completion-check
artifact_contract_required_data:
  - the unfinished items
  - the decision to go on anyway
  - where the list was recorded
artifact_contract_verified_by: the unfinished items are listed in the document and the machine verdict is rejected while any of them stands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 1
---

# Check the body of work is finished before the retro
Then check the epic is actually finished before Phase 1.
When `pending_tickets` is non-empty, interactively list those tickets and ask whether to retro an unfinished epic: if the user declines, stop and report — do not enter Phase 1; if they accept, record the tickets they accepted proceeding over in the document's Epic summary.
Headless, proceed and record the same list in the Assumptions section — do not invent a confirmation.
Either way the list sits in the document, and Phase 4's machine verdict is rejected when any ticket remained unfinished
A human may override interactively.
Tickets still at `built` — finished by the build, not yet called done — are listed in Epic summary too.
