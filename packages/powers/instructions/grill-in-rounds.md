---
instruction_id: grill-in-rounds
title: Grill in rounds
summary: "Interview by rounds: ask the whole frontier of questions whose prerequisites are settled, number each with a recommended answer, and wait for the answers."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A plan, decision or idea must be stress-tested before anyone acts on it."
conditions_does_not_apply_when: The answer is already known or the subject is a single fact.
artifact_contract_output_type: grilling-rounds
artifact_contract_required_data:
  - round
  - frontier questions
  - recommended answers
artifact_contract_verified_by: no question in a round depends on another answer in the same round
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/grilling/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/grill-me/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/grill-with-docs/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Grill in rounds
Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.
Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.
Format a round like so:
```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>
➡️ <your recommended answer>
---
❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>
➡️ <your recommended answer>
```
Word each question so "yes" accepts your recommended answer.
Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.
The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
