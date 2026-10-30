---
instruction_id: route-the-overflow-into-the-addendum
title: Route the overflow into the addendum
summary: "Capture the depth the document cannot hold in the addendum while the owner is still talking, and keep audit and override information out of it."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The owner volunteers depth that the narrative of the document cannot carry.
conditions_does_not_apply_when: The content belongs in a downstream document that already exists.
artifact_contract_output_type: addendum
artifact_contract_required_data:
  - the captured depth
  - the moment of the conversation it was captured at
artifact_contract_verified_by: the overflow was captured during the conversation and no audit or override information sits in the addendum
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Route the overflow into the addendum
The addendum
preserves user-contributed depth that belongs in a downstream document (architecture, solution design, UX spec) or earned a place but does not fit the PRD itself — rejected-alternative rationale, options-considered matrices, mechanism/transport decisions, technical-how, in-depth personas, sizing data.
Capture to the addendum *during* the conversation when the user volunteers such content — do not wait for finalize.
Audit and override information never goes in the addendum.
Whatever the length, detail that doesn't earn its place in the PRD's main narrative belongs in
the addendum
— moving overflow there is correct; padding the PRD to look thorough is not.
Aim for 1-2 pages — if it is longer, the detail belongs in the addendum.
