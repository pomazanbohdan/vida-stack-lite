---
instruction_id: read-only-the-maps-the-phase-type-needs
title: Read only the maps the phase type needs
summary: "Two or three maps are read, chosen by the phase type, and each one is read in a single call."
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Several prepared codebase maps exist and the phase needs some of them.
conditions_does_not_apply_when: No map exists.
artifact_contract_output_type: map-selection
artifact_contract_required_data:
  - the maps read
  - the phase type that selected them
artifact_contract_verified_by: no more than three maps were read and each was read in one call
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/scout-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read only the maps the phase type needs
Read 2–3 maps based on inferred phase type. Do NOT read all seven — that inflates context without improving discussion quality
Read each map file in a **single** Read call. Do not read the same file at two different offsets — split reads break prompt-cache reuse and cost more than a single full read
NOT written to a file — session-only
