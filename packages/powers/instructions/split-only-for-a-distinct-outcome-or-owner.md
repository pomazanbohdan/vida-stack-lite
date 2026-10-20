---
instruction_id: split-only-for-a-distinct-outcome-or-owner
title: Split only for a distinct outcome or owner
summary: "Work is split only for a distinct outcome, a distinct owner or a part the user wants usable early — never for a count — and a unit the work only consumes gets no container of its own."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A body of work is about to be cut into more than one container.
conditions_does_not_apply_when: The cut is already decided.
artifact_contract_output_type: split-decision
artifact_contract_required_data:
  - the reason for the cut
  - the units that get no container of their own
  - the owner of each unit the work touches
artifact_contract_verified_by: "every cut has a distinct outcome, owner or early-usable part, and no cut exists for a count"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 1
---

# Split only for a distinct outcome or owner
No boundary applies: one epic. Split only for a distinct outcome, owner, or a part the user wants usable early, never for a ticket count.
A unit the work only consumes or configures gets no epic: it is a touch point, named in the initiative's Boundaries with the epic that owns the work there.
When an initiative has epics, every story is under an epic. Work that fits one epic is proposed as one epic; say so.
Never offer an initiative without epics: it happens only at the user's request, is planned like an epic with stories directly underneath, and you say once that the initiative folder fills with ticket files.
