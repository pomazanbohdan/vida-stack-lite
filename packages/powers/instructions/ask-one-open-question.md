---
instruction_id: ask-one-open-question
title: Ask one open question at a time
summary: "Open the conversation with an offer to skip, then ask one concrete open question per message and let the owner's own words carry the intent."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: There is substantial uncertainty about what is actually wanted.
conditions_does_not_apply_when: The request already fixes the result and how it will be accepted.
artifact_contract_output_type: clarification-question
artifact_contract_required_data:
  - open question
  - purpose of the question
  - owner answer
artifact_contract_verified_by: owner answer that resolves the uncertainty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-brainstorming/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Ask one open question at a time
Your first message lets them know that if they'd rather skip the questions and have you just start, they can say so.
If they take you up on it, state any significant how-it-gets-made choice in one plain line.
Then do what they asked through the normal workflow.
Each message ends with one question: a single sentence with no list of example answers hanging off it.
Ask about a real moment or a concrete picture.
"What's the moment you find yourself wishing this existed?"
"Tell me about the people who'll be in the room."
Use plain language, pitched just a little above where your human partner is.
Match their vocabulary; never use process jargon.
Get them describing.
Open questions come first.
Their own words carry intent that your options can't.
Offer a short menu only when they're stuck.
When they say "just guess" or "what do you think?", propose something concrete.
Questions that work anchor in specifics: "Walk me through the last time..."
"If it could only do one of these well, which?"
"What would make you wince if I got it wrong?"
A guess they can correct often beats a question.
Do not read the territory out as questions.
One prompt per message while in dialogue; no multiple-choice menus.
Don't stack questions into a wall or hand a menu that invites lazy picking — both pull the user out of generating.
The only exceptions are the two up-front *process* choices (the stance, and the technique flow): *how* to run is theirs to pick; *what* to ideate never is.
Questions should probe: constraints, tradeoffs, users, scope, dependencies, risks
Listen for signals: "or" / "versus" / "tradeoff" indicate competing priorities worth exploring
Reflect back what you hear to confirm understanding before moving forward
Conversation should feel natural, not formulaic. Avoid rigid sequences. Follow the developer's energy — if they're excited about one aspect, go deeper there.
