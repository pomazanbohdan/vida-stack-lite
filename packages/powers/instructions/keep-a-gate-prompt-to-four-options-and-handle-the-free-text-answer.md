---
instruction_id: keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer
title: Keep a gate prompt to four options and handle the free-text answer
summary: "A gate prompt offers at most four options, allows one answer only, and always handles the free-text answer the user typed instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A gate asks the user to choose.
conditions_does_not_apply_when: The question is asked in free prose.
artifact_contract_output_type: gate-prompt
artifact_contract_required_data:
  - the question
  - the options
  - the handling of the free-text answer
artifact_contract_verified_by: the prompt offers at most four options and handles the typed answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/gate-prompts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Keep a gate prompt to four options and handle the free-text answer
Always handle the "Other" case (user typed a freeform response instead of selecting)
Max 4 options per prompt -- if more are needed, use a 2-step flow
multiSelect is always `false` for gate checks
header must be max 12 characters
