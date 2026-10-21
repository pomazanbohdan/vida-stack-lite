---
instruction_id: default-to-full-coverage-and-decide-every-capability
title: Default to full coverage and decide every capability
summary: "When an integration exposes a set of capabilities, the whole set is enumerated and one decision is recorded per capability, with a reason for every exclusion."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: An integration with an enumerable capability surface is about to be built.
conditions_does_not_apply_when: "The surface cannot be enumerated, so there is nothing to decide."
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - the enumerated capability surface
  - the decision per capability
  - the reason for every exclusion
artifact_contract_verified_by: every capability carries a decision and every exclusion carries a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
status: active
revision: 1
---

# Default to full coverage and decide every capability
- Every capability starts as INTEGRATE; the matrix is the *subtraction record*.
- Every `OPT-OUT` MUST carry a one-line reason (`not needed`, `not needed yet`, `explicitly out of scope`, …).
- An opt-out without a reason is an un-decided hole — the exact failure mode this gate exists to close.
