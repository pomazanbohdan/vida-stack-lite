---
instruction_id: replace-the-interactive-question-with-a-plain-list-in-text-mode
title: Replace the interactive question with a plain list in text mode
summary: "When the runtime cannot show an interactive question, the question becomes a plain-text numbered list and the answer comes back as a typed number."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The runtime cannot show an interactive question widget.
conditions_does_not_apply_when: The interactive question is available.
artifact_contract_output_type: numbered-question
artifact_contract_required_data:
  - the options as a numbered list
  - the number the person typed
artifact_contract_verified_by: the options were shown as a plain numbered list and read back as a typed number
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/regression-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Replace the interactive question with a plain list in text mode
present as a plain-text numbered list and ask the user to type their choice number.
