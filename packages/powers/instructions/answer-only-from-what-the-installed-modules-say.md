---
instruction_id: answer-only-from-what-the-installed-modules-say
title: Answer only from what the installed modules say
summary: "Every help answer is taken from the installed modules own help, never from memory or from the shape of a skill name; a project holds only some of the modules, so the recommendation comes from what is installed."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A question about the method or about the installed modules has to be answered.
conditions_does_not_apply_when: "The question is answered by running an action, not by giving help."
artifact_contract_output_type: advisor-answer
artifact_contract_required_data:
  - the help of the installed module that answers the question
artifact_contract_verified_by: the answer is traceable to the installed help and not to recollection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
---

# Answer only from what the installed modules say
Every help answer comes from the installed modules' own help, never from memory of the method or inference from skill names.
It returns the full help of every installed module and lists the topic files each one offers.
A project may hold only some of these skills: recommend from what is installed.
