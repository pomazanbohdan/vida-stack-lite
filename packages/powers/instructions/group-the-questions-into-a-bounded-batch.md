---
instruction_id: group-the-questions-into-a-bounded-batch
title: Group the questions into a bounded batch
summary: "Questions come in a bounded group of two to five, and the next group follows from the answers."
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: The user has asked to answer in batches instead of one question at a time.
conditions_does_not_apply_when: The user asked for one question at a time.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the numbered questions
  - the inline choices
artifact_contract_verified_by: the batch holds between two and five answerable questions and the next batch follows from the answers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Group the questions into a bounded batch
ask **2–5 numbered questions in one plain-text turn** per area
Clamp explicit sizes to **2–5** so a batch stays answerable
Keep each question concrete and answerable in one reply
When options are helpful, include short inline choices per question rather than a separate AskUserQuestion for every item
Preserve adaptiveness between batches: use the full set of answers to decide the next batch or whether the area is sufficiently clear
Stay adaptive, but let the user choose the pacing.
