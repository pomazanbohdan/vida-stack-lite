---
instruction_id: answer-the-question-in-a-fresh-subagent
title: Answer the question in a fresh subagent
summary: A second opinion is the same question asked in a fresh subagent that has not seen the review conversation.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The reviewer asks for a second opinion on the block under discussion.
conditions_does_not_apply_when: The reviewer asked for a formal review instead.
artifact_contract_output_type: second-opinion
artifact_contract_required_data:
  - the question that was asked
  - the answer from the fresh subagent
artifact_contract_verified_by: the subagent that answered had no access to the review conversation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 1
---

# Answer the question in a fresh subagent
Second opinion: The same question, in a fresh subagent that does not have this review's conversation. Do not use any formal review skills.
