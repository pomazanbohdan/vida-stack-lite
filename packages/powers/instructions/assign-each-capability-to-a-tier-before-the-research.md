---
instruction_id: assign-each-capability-to-a-tier-before-the-research
title: Assign each capability to a tier before the research
summary: "Each capability is mapped to its owner before the framework research starts, so a wrong assignment cannot propagate into the plans."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A set of capabilities is about to be researched.
conditions_does_not_apply_when: The application has a single layer.
artifact_contract_output_type: responsibility-map
artifact_contract_required_data:
  - each capability
  - the tier that owns it
  - the reason
artifact_contract_verified_by: every capability has a tier owner before the framework research begins
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Assign each capability to a tier before the research
Map each phase capability to its standard architectural tier owner before diving into framework research. This prevents tier misassignment from propagating into plans.
