---
instruction_id: re-slice-when-the-picture-changes
title: Re-slice when the picture changes
summary: "When completed work changes the picture, revisit the whole remaining breakdown with the user, update the unstarted entries in place with their ids, and record the reason."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: Completed work changed what the remaining work should look like.
conditions_does_not_apply_when: The remaining work is still correct as it was cut.
artifact_contract_output_type: revised-breakdown
artifact_contract_required_data:
  - the entries updated in place
  - the ids preserved
  - the reason recorded
artifact_contract_verified_by: the remaining entries are updated in place with their ids and the reason is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/choose-a-planning-path.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 2
---

# Re-slice when the picture changes
When completed work changes the picture, revisit the whole remaining breakdown with the user. Update unstarted entries and tickets in place, preserving each `id`; published changes go through the store.
Run the set check on the revised draft before the user approves it, and record the reason in the epic's Notes.
The breakdown is an execution plan, not a promise that nothing will change.
Update the spec and re-slice the remaining stories when earlier work reveals a missing constraint, a better division, or a conflict between stories.
Keep historical plans and completed states.
