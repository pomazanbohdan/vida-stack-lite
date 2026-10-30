---
instruction_id: write-a-spike-that-names-the-question-and-who-waits
title: Write a spike that names the question and who waits
summary: "A spike names the question, who waits on the answer and where the answer is recorded, and it is work a person has to accept."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An unknown blocks the work and needs an answer before implementation.
conditions_does_not_apply_when: The question can be answered from the sources at hand.
artifact_contract_output_type: spike-item
artifact_contract_required_data:
  - the question
  - who waits on the answer
  - where the answer is recorded
  - the time box
  - what a good-enough answer is
artifact_contract_verified_by: "the spike names the question, its waiters and the place the answer is recorded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/spike-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
  - operations
---

# Write a spike that names the question and who waits
A spike names the question, who waits on the answer, and where it is recorded.
A spike is `hitl`.
The steps, as many as the question needs: what to research, what to design, what to prototype, who signs off. The time box. What a good-enough answer looks like.
When tickets in more than one epic wait on the answer, it is a decision several epics adopt
