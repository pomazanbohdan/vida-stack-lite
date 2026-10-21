---
instruction_id: warn-before-you-revert-something-a-later-step-depends-on
title: Warn before you revert something a later step depends on
summary: "Before a rollback the work that depends on the target is looked for; when something depends on it, the dependency is reported and the person confirms."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A rollback takes back work that later work may build on.
conditions_does_not_apply_when: Nothing depends on the work being taken back.
artifact_contract_output_type: dependency-warning
artifact_contract_required_data:
  - the dependent work
  - the warning
  - the decision
artifact_contract_verified_by: the dependency was reported and the person decided before anything was reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/undo.md
status: active
revision: 1
---

# Warn before you revert something a later step depends on
If any downstream phase has started work, collect warnings:
If any later plan references the target plan's outputs, collect warnings:
If user selects "Abort": exit with "Revert cancelled. No changes made."
question: "Downstream work depends on the target being reverted. Proceed anyway?"
