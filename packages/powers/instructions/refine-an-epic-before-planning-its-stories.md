---
instruction_id: refine-an-epic-before-planning-its-stories
title: Refine an epic before planning its stories
summary: "An epic with `refined: false` has its scope agreed, not its detail; refine it on request or before planning its stories, then write its Requirements and set `refined: true`."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
  - requirements-clarification
conditions_applies_when: An epic is planned into stories, or the user asks to refine it.
conditions_does_not_apply_when: The epic is already refined or its stories are not being planned.
artifact_contract_output_type: refined-epic
artifact_contract_required_data:
  - what the epic, its parent and companions already settle
  - each open point and its pick
  - the epic's Requirements
artifact_contract_verified_by: "the epic's open points are settled or assigned, its Requirements are written, and `refined: true` is set"
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
  - engineering
---

# Refine an epic before planning its stories
An epic with `refined: false` has its scope agreed, not its detail.
Refine it on request or before planning its stories. Read the epic file and the initiative Requirements lines it covers.
In one message, scaled to the initiative: what the epic, the initiative and their companions already settle for its stories; each thing its stories would have to agree on that is still open, with a pick — settle it now, plan a spike first when only code can answer it, or leave it to the stories; and a reminder that the user can add intent, design or research to the epic.
An epic file with no `refined` key counts as refined.
