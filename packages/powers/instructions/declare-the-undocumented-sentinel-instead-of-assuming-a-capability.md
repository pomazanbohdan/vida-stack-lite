---
instruction_id: declare-the-undocumented-sentinel-instead-of-assuming-a-capability
title: Declare the undocumented sentinel instead of assuming a capability
summary: "A value the host's own documentation does not state is declared as the unknown sentinel and the engine fails closed; nothing is inferred from the context."
capability_tags:
  - harden-security-controls
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability is being declared for a host whose documentation is silent about it.
conditions_does_not_apply_when: "The host's documentation states the value."
artifact_contract_output_type: undocumented-sentinel
artifact_contract_required_data:
  - the axis that is not documented
  - the sentinel that is declared
  - how the engine treats it
artifact_contract_verified_by: the silent axis was declared as the sentinel and the engine failed closed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/host-integration-interface.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Declare the undocumented sentinel instead of assuming a capability
- every axis value a host declares must come from that host's authoritative documentation.
- Where docs are silent, the host declares the `undocumented` sentinel and the engine degrades fail-closed — it never assumes a capability.
