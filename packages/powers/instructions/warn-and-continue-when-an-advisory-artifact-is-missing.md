---
instruction_id: warn-and-continue-when-an-advisory-artifact-is-missing
title: Warn and continue when an advisory artifact is missing
summary: "Research is advisory input to the next step, not a gate: when it produced nothing, the run says so and continues instead of stopping."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: An advisory artifact that a later step would read was not produced.
conditions_does_not_apply_when: The artifact is a gate and the next step cannot run without it.
artifact_contract_output_type: advisory-gap
artifact_contract_required_data:
  - the missing artifact
  - the warning
  - the decision to continue
artifact_contract_verified_by: the gap is reported and the run continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/research-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/research-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Warn and continue when an advisory artifact is missing
research is advisory input to planning, never a hard gate
If a researcher does not produce
warn but continue
proceeding to planning without research
idempotent — a resumed batch skips items already researched
