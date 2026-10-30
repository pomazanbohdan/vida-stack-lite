---
instruction_id: link-the-design-and-keep-the-criteria-functional
title: Link the design and keep the criteria functional
summary: A user-facing item links its design and says plainly what the builder has to guess when there is no design.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A work item is about a user-facing surface and a design exists.
conditions_does_not_apply_when: The work item has no user-facing part.
artifact_contract_output_type: design-linked-item
artifact_contract_required_data:
  - the design reference
  - the functional criteria
  - what the builder must guess when no design exists
artifact_contract_verified_by: the design owns the layout and the criteria stay functional
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Link the design and keep the criteria functional
A UI ticket links its design in References; criteria stay functional, layout lives in the design.
No design and user-facing: offer the design skill first; declined, say the builder will guess the layout unless they add details in Notes.
