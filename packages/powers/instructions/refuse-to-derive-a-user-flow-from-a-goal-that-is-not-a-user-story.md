---
instruction_id: refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story
title: Refuse to derive a user flow from a goal that is not a user story
summary: "The goal has to be written as a user story before the flow can be derived from it; when it is not, the run stops instead of inventing a poor script."
capability_tags:
  - harden-validation
pattern_tags:
  - specification-gate
conditions_applies_when: A verification script is derived from the goal of the work.
conditions_does_not_apply_when: The goal is already a user story.
artifact_contract_output_type: user-story-check
artifact_contract_required_data:
  - the goal
  - the validation verdict
  - the guidance that comes with it
artifact_contract_verified_by: the script was not derived from a goal that failed the user-story check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/steps/mvp-uat-framing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Refuse to derive a user flow from a goal that is not a user story
The verb owns the canonical regex `/^As a .+, I want to .+, so that .+\.$/` and returns slot extractions plus per-error guidance when invalid.
Halt UAT generation on failure — never attempt to derive user-flow steps from a non-User-Story goal (low-quality UAT).
