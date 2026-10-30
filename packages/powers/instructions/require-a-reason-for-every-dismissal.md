---
instruction_id: require-a-reason-for-every-dismissal
title: Require a reason for every dismissal
summary: "An edge that does not apply is dismissed with a written reason; silence is not a dismissal, and an unresolved edge stays carried forward."
capability_tags:
  - clarify-requirements
pattern_tags:
  - decision-trail
conditions_applies_when: A raised edge is closed as not applicable or left open.
conditions_does_not_apply_when: The edge is resolved with a check that enforces it.
artifact_contract_output_type: edge-disposition
artifact_contract_required_data:
  - the edge
  - its state
  - the reason for a dismissal
artifact_contract_verified_by: every dismissal carries a non-empty reason and every open edge stays visible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/edge-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Require a reason for every dismissal
Dismissal requires a reason string. "N/A — input is a bounded enum, no boundary exists" is valid; silence is not.
The reason string is the audit trail.
dismissed — not applicable, accompanied by a required, non-empty reason string.
unresolved — carried forward and flagged; the author chose not to resolve it yet.
