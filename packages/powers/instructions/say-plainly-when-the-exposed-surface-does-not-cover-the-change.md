---
instruction_id: say-plainly-when-the-exposed-surface-does-not-cover-the-change
title: Say plainly when the exposed surface does not cover the change
summary: "The exposed fields are the boundary, step logic and ordering included: say so plainly instead of inventing a field."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request asks for something the exposed configuration cannot carry.
conditions_does_not_apply_when: The request maps onto a field that is already exposed.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the part of the request that is outside the exposed surface
  - the nearest exposed approximation offered
artifact_contract_verified_by: no field outside the exposed surface appears in the override
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Say plainly when the exposed surface does not cover the change
When the target's configuration doesn't expose what the user wants, say so plainly.
Don't invent fields.
Intent outside the exposed surface (step logic, ordering, anything not exposed): say so
