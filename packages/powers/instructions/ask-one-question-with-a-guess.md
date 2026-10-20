---
instruction_id: ask-one-question-with-a-guess
title: "Ask one question at a time, each with a guess"
summary: "Ask one focused question per turn, attach your guess and the reasoning behind it, and wait for the reaction before the next question."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent is still uncertain and the user is present to answer.
conditions_does_not_apply_when: "The answer is already known, or the question concerns a fact you can look up yourself."
artifact_contract_output_type: guessed-question
artifact_contract_required_data:
  - the single focused question
  - the guess at the answer
  - the reasoning that produced the guess
artifact_contract_verified_by: the user reacts to the guess before the next question is asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 1
---

# Ask one question at a time, each with a guess

Format:

```
Q: <one focused question>
GUESS: <your hypothesis for the answer, with the reasoning that produced it>
```

Wait for the user to react before asking the next question.

**Why one at a time, not a batch:**

- The user can't react to your hypotheses if you bury them in a list
- Batches encourage skim-reading and surface answers
- The third question often depends on the answer to the first; asking them all at once locks in the wrong framing
- The user's energy for thinking carefully is finite; spend it one question at a time

**Why attach a guess:**

- The user reacts faster to a wrong guess than they generate an answer from scratch
- It commits you to a hypothesis you can be visibly wrong about, which keeps you honest
- It surfaces *your* assumptions, which is what the interview is meant to expose

The risk here is a polite user agreeing with your guess to be agreeable. Mitigate by being visibly willing to be wrong, and occasionally guess in a direction you expect the user to push back on.
