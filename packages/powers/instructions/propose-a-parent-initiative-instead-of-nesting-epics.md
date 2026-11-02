---
instruction_id: propose-a-parent-initiative-instead-of-nesting-epics
title: Propose a parent initiative instead of nesting epics
summary: "When the work is more than one initiative's worth, propose a parent initiative over child initiatives; the parent lists children in build order and holds no epics or entries."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is larger than one initiative.
conditions_does_not_apply_when: The work fits one initiative and its epics.
artifact_contract_output_type: parent-initiative
artifact_contract_required_data:
  - the child initiatives in build order
  - each child's id, slug, description, covers and after
  - the parent's shared Requirements
artifact_contract_verified_by: "the parent lists only child initiatives and every child names the parent in `sources:`"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Propose a parent initiative instead of nesting epics
When the work is more than one initiative's worth, propose a parent initiative over child initiatives, not epics inside epics.
The parent is an ordinary initiative whose `tickets/tickets.toml` lists its child initiatives in build order, each with an `id`, the child's folder name as `slug`, a description of what is true when it is done, the parent ids it `covers`, and an `after` naming what it needs from which child.
Each child is its own `initiative-<slug>/` beside the parent, with the parent's file in `sources:`; its Requirements are written per `spec.md` when it is taken up.
The parent holds no epics or entries.
