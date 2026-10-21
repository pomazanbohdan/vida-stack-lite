---
instruction_id: check-that-every-decision-survives-into-the-work
title: Check that every decision survives into the work
summary: "Every decision that was recorded is checked against the work that was planned, and nothing that was deferred is implemented; a decision that was dropped is a finding, not a detail."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The planned work is checked against the decisions that were recorded.
conditions_does_not_apply_when: No decisions were recorded for this work.
artifact_contract_output_type: decision-coverage
artifact_contract_required_data:
  - the recorded decisions
  - the work items that cover them
  - the deferred items that must not be implemented
artifact_contract_verified_by: every recorded decision is covered by the work and no deferred item was implemented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/context-md.md
status: active
revision: 1
---

# Check that every decision survives into the work
- Every `D-NN` identifier in `<decisions>` must appear in at least one plan task's `<action>` or rationale.
- No task may implement anything listed in `<deferred>` (scope creep).
