---
instruction_id: map-each-capability-to-the-tier-that-owns-it
title: Map each capability to the tier that owns it
summary: "Before the details are researched, every capability is assigned to the layer that owns it, so the work is not planned into the wrong layer."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A piece of work spans more than one layer.
conditions_does_not_apply_when: The work lives entirely inside one layer.
artifact_contract_output_type: responsibility-map
artifact_contract_required_data:
  - the capability
  - the owning tier
artifact_contract_verified_by: every capability has an owning tier and the rationale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# Map each capability to the tier that owns it
Before diving into framework-specific research, map each capability in this phase to its standard architectural tier owner.
Multi-tier applications frequently have capabilities misassigned during planning
Mapping tier ownership before research prevents these misassignments from propagating into plans.
