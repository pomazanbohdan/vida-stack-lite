---
instruction_id: check-every-layer-of-a-configuration
title: Check every layer of a configuration
summary: "A configuration is verified across schema, defaults and code, because agreement between only some of the layers hides the mismatch."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: A configuration flag or setting is verified.
conditions_does_not_apply_when: The setting has a single layer.
artifact_contract_output_type: config-layer-check
artifact_contract_required_data:
  - the layers that were checked
  - the layer that disagrees
  - the consequence
artifact_contract_verified_by: "schema, defaults and code were checked against each other"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Check every layer of a configuration
Gap: Defaults exist in code but schema validation doesn't know about them.
Status: FAILED -- Config flags work in code but are invisible to schema validation.
The verifier checked multiple config layers (schema vs defaults vs code) rather than just one.
Config wiring requires schema + defaults + code to agree -- checking only one layer misses layer-mismatch bugs.
