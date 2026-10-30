---
instruction_id: walk-the-user-through-the-flow-before-running-the-technical-checks
title: Walk the user through the flow before running the technical checks
summary: "The user-flow walk-through comes first, the technical checks only follow it, and the coverage check comes last."
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A user-facing phase is being verified.
conditions_does_not_apply_when: The phase has no user-facing surface.
artifact_contract_output_type: uat-script
artifact_contract_required_data:
  - the user-flow steps
  - the expected outcome of each
  - the technical checks
  - the coverage check
artifact_contract_verified_by: the flow ran first and a failed step stopped the run before the technical checks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verify-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - product
---

# Walk the user through the flow before running the technical checks
If any step fails, the verdict is FAIL — do not run technical checks
The user-flow walk-through is mandatory under MVP mode even when all unit tests are green
The first step opens the entry point
Each subsequent step is one user action: fill, click, type, observe
The final step asserts the user-visible outcome from the `[outcome]` clause of the user story
