---
instruction_id: stop-when-you-can-predict-the-reaction
title: Stop when you can predict the reaction
summary: "End the interview when you can predict the user's reaction to the next three questions, and stop earlier if several rounds pass without progress."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The interview has run for a number of rounds and the intent may already be settled.
conditions_does_not_apply_when: The ask was unambiguous and no interview was needed.
artifact_contract_output_type: interview-stop
artifact_contract_required_data:
  - the prediction test and its answer
  - "the restate produced, or the step-back offered"
artifact_contract_verified_by: the prediction test was answered and either the restate was produced or the user was told what is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 1
---

# Stop when you can predict the reaction

You're done when you can answer yes to this:

> *Can I predict the user's reaction to the next three questions I would ask?*

If yes, you have shared understanding. Stop interviewing and produce the restate. If no, you're not done; ask the next question.

This is a checkable test, not a vibe. It also has a floor: if you've gone several rounds and still can't predict, that's information about the ask, not a reason to keep grinding. Stop and tell the user: "I've asked X questions and I still can't predict your reactions. Something foundational is missing. Want to step back?"

Three or more rounds without your confidence visibly rising: you're asking the wrong questions, step back and reframe.
