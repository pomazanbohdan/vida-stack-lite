---
instruction_id: map-each-pitfall-to-a-phase-that-prevents-it
title: Map each pitfall to a phase that prevents it
summary: Every pitfall names the phase that has to prevent it and how the prevention is checked.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The pitfalls are not tied to phases.
artifact_contract_output_type: pitfall-phase-map
artifact_contract_required_data:
  - the pitfall
  - the phase that prevents it
  - the check that confirms it
artifact_contract_verified_by: every pitfall names a prevention phase and the check that confirms it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body maps unspecified domain pitfalls to roadmap phases but names no supported engineering, product, business, research, or operations subject."
---

# Map each pitfall to a phase that prevents it
Link to specific phases — makes pitfalls actionable
Each pitfall should map to a phase that prevents it
**Phase to address:** [Which roadmap phase should prevent this]
