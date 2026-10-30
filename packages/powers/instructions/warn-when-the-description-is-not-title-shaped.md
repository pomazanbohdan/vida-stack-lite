---
instruction_id: warn-when-the-description-is-not-title-shaped
title: Warn when the description is not title-shaped
summary: "A long, multi-sentence description used as a title is not silently accepted: the item is still created, the warning is surfaced, and a short title with the detail moved into the body is suggested."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The text supplied as a title reads as a goal or a paragraph rather than as a title.
conditions_does_not_apply_when: The supplied text is already a short title.
artifact_contract_output_type: title-warning
artifact_contract_required_data:
  - the warning
  - the suggested short title
  - where the detail belongs
artifact_contract_verified_by: the warning was surfaced and the item was created with the detail moved out of the title
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Warn when the description is not title-shaped
The description read as goal-shaped (long and/or multi-sentence) rather than title-shaped, and was written verbatim as the `### Phase N:` header.
The phase was still created - surface the warning to the user and suggest a short title with the detail moved to `**Goal:**`
