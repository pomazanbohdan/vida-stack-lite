---
instruction_id: mark-a-ticket-that-needs-a-person
title: Mark the work that needs a person
summary: "A step that only a person can do is marked as such, and the item says which step it is."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: Part of a work item can only be done by a person.
conditions_does_not_apply_when: The whole item can be done by an agent.
artifact_contract_output_type: human-step-item
artifact_contract_required_data:
  - the marker that a person is needed
  - which step it is
  - the steps spelled out
artifact_contract_verified_by: the marker names the step that needs a person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/spike-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Mark the work that needs a person
hitl: boolean frontmatter field on a leaf; at least part needs a person
`hitl: true` only when a person must do part of the work; say which step in the Description, and spell known steps out in the criteria or Notes.
A spike is `hitl`.
Setup and each hitl step go on the first story that needs them, under the relevant epic and never loose under the initiative; initiative-wide setup belongs to the opening epic.
