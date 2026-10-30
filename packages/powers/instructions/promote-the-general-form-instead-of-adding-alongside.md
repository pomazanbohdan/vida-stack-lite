---
instruction_id: promote-the-general-form-instead-of-adding-alongside
title: Promote the general form instead of adding alongside
summary: "When a second case generalises a model, the new general form becomes the primary one and the old specific form becomes a variant of it."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A dimension that had one case now has a second one.
conditions_does_not_apply_when: No second case has appeared in that dimension.
artifact_contract_output_type: model-decision
artifact_contract_required_data:
  - the noun that is now primary
  - the decision
  - the one-line rationale
artifact_contract_verified_by: the general representation is the primary one and the old one is a variant
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/assumption-delta/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Promote the general form instead of adding alongside
- The usual correct move when a generalization occurs is to **promote** the new general representation to the primary and **demote** the old specific one to a detail of one variant — *not* to add the new one alongside the still-required old one.
- Adding alongside silently contradicts the generalized intent (a later variant that does not fit the old primary can be stored but never confirmed as a default).
- The **noun** that is now primary (the generalized identity).
- The **decision**: `promote` | `add-alongside` | `no-change`, with a one-line rationale.
