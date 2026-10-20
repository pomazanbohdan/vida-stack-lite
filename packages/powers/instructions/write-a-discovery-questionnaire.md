---
instruction_id: write-a-discovery-questionnaire
title: Write a discovery questionnaire
summary: "Turn a decision you cannot answer alone into a questionnaire for the one person who holds the missing knowledge, grilling the send rather than the subject."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The blocker is knowledge that lives with someone else.
conditions_does_not_apply_when: The answer can be found in the environment or by the user directly.
artifact_contract_output_type: questionnaire
artifact_contract_required_data:
  - recipient
  - what is needed back
  - questions
  - answer stubs
artifact_contract_verified_by: every item the user named as needed is covered by a question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/to-questionnaire/SKILL.md
status: active
revision: 1
---

# Write a discovery questionnaire
Turn something the user can't answer alone into a **questionnaire**: a Markdown document they hand to one person to fill in async, or fill out together over a meeting. The recipient holds knowledge the user lacks; the questionnaire pulls it out of them.
**Grill the send, not the subject.** Interview the user only about the _send_, which they can always answer: who it goes to, and what they need back. The questions in the document then target the **gap** between what the recipient knows and what the user needs.
1. **Who is it going to?** Ask, in one exchange, the recipient's role, expertise, and relationship to the user. This fixes the questionnaire's tone and how much context it must carry. Done when you know who the recipient is and what they know that the user doesn't.
2. **What do you need back?** Ask, in one exchange, the specific decisions or facts the user can't resolve alone and needs from this person. Done when you have a concrete list of what the user must walk away able to do or decide.
3. **Write the questionnaire.** Draft questions aimed at the gap from steps 1–2. Write it to a file named after the topic in the current directory and report the path. Done when the file exists and every item the user named in step 2 is covered by a question.
Frame the document as a **discovery questionnaire**: the user lacks context, the recipient holds it. Order questions most-important-first, since async means you may only get one pass, and group them under `##` headings by theme once there are more than a handful. Every question is one idea, never compound, with an answer stub directly beneath, and a one-line _why this matters_ only where the question could be misread or invite a throwaway answer.
