---
instruction_id: fold-a-thin-phase-into-its-nearest-neighbour
title: Fold a thin phase into its nearest neighbour
summary: "A phase with one requirement, an internal-quality goal, or criteria that read as tasks is folded into the closest related phase instead of standing alone."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A planned item would carry a single requirement or a goal that is not user-observable.
conditions_does_not_apply_when: The item delivers a capability of its own that can be verified on its own.
artifact_contract_output_type: phase-structure
artifact_contract_required_data:
  - the phase the thin item was folded into
  - the reason it was not a phase
artifact_contract_verified_by: no standalone phase carries a single requirement or an internal-quality goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-roadmapper.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Fold a thin phase into its nearest neighbour
When a phase you are about to write would have a single requirement, an internal-quality goal ("improve X", "refactor Y", "add tests for Z"), or success criteria that read as tasks rather than user-observable outcomes, prefer to fold it into the most-related neighbor instead of creating a standalone phase.
