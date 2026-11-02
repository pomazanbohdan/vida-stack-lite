---
instruction_id: ask-one-open-question
title: Ask one open question at a time
summary: "Open by moving the work forward: echo a supplied request in about 200 words or ask one concrete open question, then ask only what the context leaves open."
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/explore.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Ask one open question at a time
Open the conversation by moving the work forward.
If they already said what they want — a spec, a plan, a detailed request — aim for about 200 words for the whole message.
Echo their request back in your own words: what they want, who it's for, and why, as far as they've said.
Add what you found that bears on it: how the relevant parts work today and what the change would touch.
If you found a constraint, conflict, or cheaper path they may not have considered, say so plainly.
End with one line inviting corrections, then one open question about what they want: the thing their request leaves open whose answer would most change what gets built.
If they haven't described what they want, ask one open question in their own terms about the biggest thing their request leaves unsettled.
Say why you're asking: what the answer would change about what you build.
If they asked for brainstorming, end with your question.
If they didn't, add a light one-line offer to just get going instead.
If they take you up on it, state any significant how-it-gets-made choice (platform, language, medium) in one plain line, then do what they asked through the normal workflow.
Each message ends with one question: a single sentence with no list of example answers hanging off it.
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
