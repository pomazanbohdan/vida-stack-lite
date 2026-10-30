---
instruction_id: a-masked-value-is-still-plaintext-on-disk
title: A masked value is still plaintext on disk
summary: "Masking hides a value on screen only; the store that holds it is the security boundary, so the exposure is documented instead of being routed around with an invented side channel."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A credential or secret is written into a configuration file that masking only hides on screen.
conditions_does_not_apply_when: The value is encrypted at rest or never written to disk.
artifact_contract_output_type: secret-storage-note
artifact_contract_required_data:
  - where the value is stored
  - what masking does
  - what the user has to do about it
artifact_contract_verified_by: the note names the store as the boundary and does not route around it with a private side channel
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/list-your-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# A masked value is still plaintext on disk
masking applies to display only, and that file is the security boundary
document the exposure for your users rather than leaving them to discover it — and never invent your own storage side-channel to route around it.
