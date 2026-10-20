---
instruction_id: distinguish-what-they-want-from-what-they-should-want
title: Distinguish what they want from what they should want
summary: "Watch for answers that pattern-match convention or best practice, and ask what they would actually want if they did not have to justify it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The user answers with convention, best-practice language or a buzzword instead of a specific outcome."
conditions_does_not_apply_when: "The answer already names a concrete outcome, user and measure."
artifact_contract_output_type: intent-probe
artifact_contract_required_data:
  - the convention or buzzword heard
  - the probe asked
  - "the user's own answer"
artifact_contract_verified_by: the probe was asked and the answer names a specific outcome rather than a category
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 1
---

# Distinguish what they want from what they should want

The most dangerous answers are the ones where the user says what a thoughtful answer *sounds like* rather than what they actually want. Watch for:

- Answers that pattern-match best-practice talk ("I want it to be scalable", "clean architecture") without specifics
- Answers that defer to convention ("the way most apps do it", "the standard approach")
- Phrases like "I should probably…", "I think I'm supposed to…", "good engineering practice says…"
- Buzzwords as goals — when "modern", "scalable", "robust" are the answer instead of a specific outcome

When you hear these, the question to ask is:

> *"If you didn't have to justify this to anyone, what would you actually want?"*

That single question often does more work than the previous five.
