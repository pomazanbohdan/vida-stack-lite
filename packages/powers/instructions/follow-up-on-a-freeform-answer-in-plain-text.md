---
instruction_id: follow-up-on-a-freeform-answer-in-plain-text
title: Follow up on a freeform answer in plain text
summary: A freeform answer is followed up as plain text and reflected back before the next question.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user answered a question with freeform text instead of choosing an option.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the reflected input
  - the follow-up question
artifact_contract_verified_by: the follow-up is asked as plain text and the input is reflected back before the next question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Follow up on a freeform answer in plain text
If user picks "Other" to provide freeform input (e.g., "let me describe it", "something else", or an open-ended reply), ask your follow-up as plain text — NOT another AskUserQuestion.
Wait for them to type at the normal prompt, then reflect their input back and confirm before resuming AskUserQuestion or the next numbered batch.
