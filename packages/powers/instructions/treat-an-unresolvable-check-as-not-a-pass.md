---
instruction_id: treat-an-unresolvable-check-as-not-a-pass
title: Treat an unresolvable check as not a pass
summary: "A check that could not look is reported as a warning, never as a pass, and the failing target is named verbatim without prescribing a replacement."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A deterministic check reports that it could not read what it was asked to check.
conditions_does_not_apply_when: The check ran and produced a verdict.
artifact_contract_output_type: check-verdict
artifact_contract_required_data:
  - the target that could not be checked
  - the verdict that it is not a pass
artifact_contract_verified_by: the unresolved target is named and the verdict is a warning rather than a pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/plan-checker-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat an unresolvable check as not a pass
already run; do NOT re-derive these verdicts by reading the filesystem yourself
A non-empty `readError` means the probe could not look — an Important finding, not a pass
Report the failing target verbatim; never prescribe a replacement path
`status: pending_creation` is not a finding
