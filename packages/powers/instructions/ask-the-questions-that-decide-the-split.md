---
instruction_id: ask-the-questions-that-decide-the-split
title: Ask the questions that decide the split
summary: "Ask only the questions that change the cut, grouped, and say which answer you would pick and why."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The cut of the work is not decided yet.
conditions_does_not_apply_when: The cut is already decided and only the items are missing.
artifact_contract_output_type: split-questions
artifact_contract_required_data:
  - the questions that change the cut
  - the answer you would pick
  - the reason
artifact_contract_verified_by: every question asked changes the cut and each carries your own answer and reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 1
---

# Ask the questions that decide the split
Use what is already known. Ask the remaining questions that change the split: what is first worth demoing; what is least certain; what will the first piece teach about the rest; whether the user has a split in mind; how the team defines epics. Group related questions and say which answer you would pick and why.
