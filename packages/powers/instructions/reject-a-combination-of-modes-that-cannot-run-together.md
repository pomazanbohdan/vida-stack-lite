---
instruction_id: reject-a-combination-of-modes-that-cannot-run-together
title: Reject a combination of modes that cannot run together
summary: Two modes that contradict each other are refused before anything is dispatched.
capability_tags:
  - execute-plan
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The run was asked for two modes at once.
conditions_does_not_apply_when: Only one mode was asked for.
artifact_contract_output_type: mode-conflict-report
artifact_contract_required_data:
  - the two modes
  - the reason they cannot run together
artifact_contract_verified_by: the conflicting modes were refused before any work was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/reviews-prerequisite.md
status: active
revision: 1
---

# Reject a combination of modes that cannot run together
Error — cannot combine
These are conflicting modes.
