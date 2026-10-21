---
instruction_id: switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words
title: Switch to plain text when the user wants to describe in their own words
summary: "As soon as the user signals that they want to answer in their own words, the option menu stops and the follow-up is asked in plain text."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user replies with an open-ended answer instead of choosing an option.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: plain-text-follow-up
artifact_contract_required_data:
  - the signal that stopped the menu
  - the plain-text question
artifact_contract_verified_by: the follow-up was asked in plain text and the menu resumed only after the freeform answer was processed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/questioning.md
status: active
revision: 1
---

# Switch to plain text when the user wants to describe in their own words
**When the user wants to explain freely, STOP using**
the option menu.
If a user selects "Other" and their response signals they want to describe something in their own words (e.g. "let me describe it", "I'll explain", "something else", or any open-ended reply that isn't choosing/modifying an existing option), you MUST:
1. **Ask your follow-up as plain text** - NOT via
the option menu
2. **Wait for them to type at the normal prompt**
3. **Resume**
only after processing their freeform response
The same applies if YOU include a freeform-indicating option (like "Let me explain" or "Describe in detail") and the user selects it.
