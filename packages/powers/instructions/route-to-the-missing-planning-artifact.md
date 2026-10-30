---
instruction_id: route-to-the-missing-planning-artifact
title: Route to the missing planning artifact
summary: "When the planning state is incomplete, the run names the missing artifact and routes to the step that fills it."
capability_tags:
  - plan-implementation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: The planning state exists but some of its artifacts are missing.
conditions_does_not_apply_when: All planning artifacts are present.
artifact_contract_output_type: missing-artifact-route
artifact_contract_required_data:
  - the missing artifact
  - the command that fills it
artifact_contract_verified_by: the missing artifact is named and the run does not continue past it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/onboard.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/reviews-prerequisite.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Route to the missing planning artifact
Project planning exists but is incomplete.
Run the appropriate lower-level command to fill the missing planning artifact(s)
Run the review first
Then re-run the planning step
