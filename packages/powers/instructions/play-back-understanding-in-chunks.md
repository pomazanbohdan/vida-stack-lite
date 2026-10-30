---
instruction_id: play-back-understanding-in-chunks
title: Play back understanding in chunks
summary: "Describe each understood part back in about 200-300 words, mark guesses as guesses, and ask what is wrong or missing before moving on."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The need has several parts that must be confirmed separately.
conditions_does_not_apply_when: The need fits in one short sentence and has no parts.
artifact_contract_output_type: understanding-playback
artifact_contract_required_data:
  - chunk playback
  - marked guesses
  - owner correction
artifact_contract_verified_by: owner correction of each playback
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Play back understanding in chunks
Play back as you go.
As soon as you understand one part well enough to describe it, describe that part back in about 200-300 words.
Describe what it's for and who it serves, or how one piece behaves.
Then return to questions about the next part.
Playback and questions alternate through the whole conversation.
The last chunk covers whatever is left.
Mark anything you're guessing as your guess.
Only what they said goes in as theirs.
End each chunk by asking what's wrong or missing.
Before you send a chunk, check it: does it describe something they'll look at?
If so, and they haven't seen the visual companion offer yet, send the offer instead.
Hold the chunk for the next message.
Once they've accepted, put a mockup next to the description.
People often haven't finished working out what they want.
Good questions help them think it through.
