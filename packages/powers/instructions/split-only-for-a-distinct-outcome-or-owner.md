---
instruction_id: split-only-for-a-distinct-outcome-or-owner
title: Split only for a distinct outcome or an early-usable part
summary: "Work is split only for a distinct outcome or a part the user wants usable early — never for a count or an owner — and a unit the work only consumes gets no container of its own."
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
  - the outcome or early-usable part each cut delivers
artifact_contract_verified_by: "every cut has a distinct outcome or early-usable part, and no cut exists for a count"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Split only for a distinct outcome or an early-usable part
No boundary applies: one epic. Split only for a distinct outcome or a part the user wants usable early, never for a ticket count or an owner.
A unit the work only consumes or configures gets no epic: it is a touch point, named in the initiative's Boundaries with the epic that owns the work there.
When an initiative has epics, every story is under an epic. Work that fits one epic is proposed as one epic; say so.
When the work is more than one initiative's worth, propose a parent initiative over child initiatives, not epics inside epics; the parent holds the shared Requirements and no epics or entries.
Never offer an initiative without epics except as that parent: a single initiative with stories directly underneath happens only at the user's request, is planned like an epic with stories directly underneath, and you say once that the initiative folder fills with ticket files.
