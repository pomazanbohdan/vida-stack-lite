---
instruction_id: prefer-vertical-slices-over-horizontal-layers
title: Prefer vertical slices over horizontal layers
summary: The phase is decomposed into vertical slices; a horizontal layer decomposition is used only when a shared foundation is required.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: The plans of a phase are laid out.
conditions_does_not_apply_when: The phase genuinely needs a shared foundation first.
artifact_contract_output_type: decomposition-order
artifact_contract_required_data:
  - the slices
  - the order they run in
  - the reason for a horizontal step
artifact_contract_verified_by: the plans are slices unless a shared foundation was required
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer vertical slices over horizontal layers
**Prefer vertical slices** (User feature: model+API+UI) over horizontal layers (all models → all APIs → all UIs). Vertical = parallel. Horizontal = sequential. Use horizontal only when shared foundation is required
