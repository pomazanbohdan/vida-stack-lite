---
instruction_id: stop-the-option-picker-when-the-user-wants-to-type
title: Stop the option picker when the user wants to type
summary: When the user answers in their own words the follow-up is plain text; the option picker resumes only after that answer is processed.
capability_tags:
  - clarify-requirements
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The user chose the free-form option or answered in their own words.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: freeform-continuation
artifact_contract_required_data:
  - the plain-text follow-up
  - the wait for the typed answer
artifact_contract_verified_by: the follow-up was asked in plain text and the picker resumed afterwards
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/questioning.md
status: active
revision: 1
---

# Stop the option picker when the user wants to type
**When the user wants to explain freely, STOP using AskUserQuestion.**
1. **Ask your follow-up as plain text** — NOT via AskUserQuestion
2. **Wait for them to type at the normal prompt**
3. **Resume AskUserQuestion** only after processing their freeform response
The same applies if YOU include a freeform-indicating option (like "Let me explain" or "Describe in detail") and the user selects it
