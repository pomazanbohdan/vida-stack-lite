---
instruction_id: require-a-reason-for-every-dismissed-prohibition
title: Require a reason for every dismissed prohibition
summary: "A dismissed constraint carries a non-empty reason; silence is not a resolution, and an unresolved one is carried forward and flagged."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A surfaced constraint is dismissed or left unresolved.
conditions_does_not_apply_when: The constraint was resolved.
artifact_contract_output_type: prohibition-lifecycle
artifact_contract_required_data:
  - the status
  - the reason
  - the flag
artifact_contract_verified_by: every dismissal carries a reason and every unresolved item is flagged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Require a reason for every dismissed prohibition
not a genuine prohibition for this feature, accompanied by a required, non-empty reason string. "N/A — this utility has no user-facing surface, no values constraint applies" is valid; silence is not. The reason string is the audit trail
carried forward and flagged; the author chose not to resolve it yet
