---
instruction_id: map-the-capabilities-before-specing-modules
title: Map the capabilities before specing the modules
summary: "A request that bundles several independently testable capabilities gets an approved capability map first — module ids, dependency direction and build order — and each module is speced in dependency order."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: The request bundles several independently testable capabilities.
conditions_does_not_apply_when: The request is one capability.
artifact_contract_output_type: capability-map
artifact_contract_required_data:
  - the module ids
  - the dependency direction
  - the build order
  - the approval
artifact_contract_verified_by: the map is approved before any module is speced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Map the capabilities before specing the modules
If the request bundles several independently testable capabilities, first propose a capability map (module ids, dependency direction, build order)
and get it approved, then spec each module in dependency order.
