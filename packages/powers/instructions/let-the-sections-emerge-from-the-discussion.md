---
instruction_id: let-the-sections-emerge-from-the-discussion
title: Let the sections emerge from the discussion
summary: The sections of the decision document are not predefined; they are the ones the discussion actually produced.
capability_tags:
  - clarify-requirements
pattern_tags:
  - output-formatting
conditions_applies_when: A decision document for a piece of work is written.
conditions_does_not_apply_when: The document has a fixed set of sections from a template.
artifact_contract_output_type: decision-document-sections
artifact_contract_required_data:
  - the sections that were discussed
  - the decision recorded under each
artifact_contract_verified_by: every section corresponds to something the discussion covered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Let the sections emerge from the discussion
**Key principle:** Categories are NOT predefined. They emerge from what was actually discussed for THIS phase. A CLI phase has CLI-relevant sections, a UI phase has UI-relevant sections.
