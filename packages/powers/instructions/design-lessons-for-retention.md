---
instruction_id: design-lessons-for-retention
title: Design lessons for retention
summary: "Design lessons for long-term retention with retrieval practice, spacing and interleaving, and keep each lesson short with one tangible win."
capability_tags:
  - teach-with-workspace
pattern_tags:
  - teaching-workspace
conditions_applies_when: A lesson is authored for a learner who will return to it.
conditions_does_not_apply_when: The goal is only immediate fluency.
artifact_contract_output_type: lesson
artifact_contract_required_data:
  - lesson
  - retrieval practice
  - one win
artifact_contract_verified_by: the lesson is completable quickly and builds storage strength rather than fluency alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/SKILL.md
status: active
revision: 1
---

# Design lessons for retention
A lesson is the main thing you produce: the unit in which knowledge and skills reach the user. Each lesson is one self-contained HTML file, saved to `lessons/` and titled `0001-<dash-case-name>.html` where the number increments each time.
A lesson should be **beautiful**, with clean, readable typography and layout, since the user will return to these later to review.
The lesson should be short, and completable very quickly. Learners' working memory is very small, and we need to stay within it. But each lesson should give the user a single tangible win that they can build on. It should be directly tied to the mission, and should be in the user's zone of proximal development.
If possible, open the lesson file for the user by running a CLI command.
Each lesson should link via HTML anchors to other lessons and reference documents.
Each lesson should recommend a primary source for the user to read or watch. This should be the most high-quality, high-trust resource you found on the topic.
Each lesson should contain a reminder to ask followup questions to the agent. The agent is their teacher, and can assist with anything that's unclear.
## Fluency vs Storage Strength
You should be careful to split between two types of learning:
- **Fluency strength**: in-the-moment retrieval of knowledge
- **Storage strength**: long-term retention of knowledge
Fluency can give the user an illusory sense of mastery, but storage strength is the real goal. Try to design lessons which build long-term retention by desirable difficulty:
- Using retrieval practice (recall from memory)
- Spacing (distributing practice over time)
- Interleaving (mixing up different but related topics in practice - for skills practice only)
## Skills
If knowledge is all about acquisition, skills are about durability and flexibility. Make the knowledge stick.
For skill acquisition, difficulty is the tool. Effortful retrieval is what builds storage strength. Skills should be taught through interactive lessons. There are several tools at your disposal:
- Interactive lessons, using quizzes and light in-browser tasks
- Lessons which guide the user through a list of real-world steps to take
Each of these should be based on a **feedback loop**, where the user receives feedback on their performance. This feedback loop should be as tight as possible, giving feedback immediately - and ideally automatically.
For quizzes, each answer should be exactly the same number of words (and characters, if possible). Vary which position holds the correct answer across questions. Don't give the user any clues about the answer through formatting or order.
