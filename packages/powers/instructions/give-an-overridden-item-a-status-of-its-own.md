---
instruction_id: give-an-overridden-item-a-status-of-its-own
title: Give an overridden item a status of its own
summary: "An overridden item has a status distinct from both verified and failed, it counts as passing, and it never removes a human-needed item."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: An overridden must-have appears in a verification table.
conditions_does_not_apply_when: No override was applied.
artifact_contract_output_type: override-status
artifact_contract_required_data:
  - the status
  - the reason
  - the acceptor
artifact_contract_verified_by: the status is visually distinct and the evidence names the reason and the acceptor
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verification-overrides.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Give an overridden item a status of its own
The `PASSED (override)` status must be visually distinct from both `VERIFIED` and `FAILED`. In the evidence column, include the override reason and who accepted it
`PASSED (override)` items count toward the passing score, not the failing score
Overrides do NOT suppress `human_needed` items — those still require human testing
If the underlying code now satisfies the must-have, the override becomes unnecessary — mark as VERIFIED instead
Overrides are never removed automatically; they persist as documentation
