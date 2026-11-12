---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-references-help-md-b35a8120-c01"
title: "bmad-method: skills/bmad/references/help.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad/references/help.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad/references/help.md\"}"
atom_ids:
  - answer-the-question-before-recommending-a-route
  - read-every-installed-module-before-answering
atom_count: 2
atoms: "[{\"atom_id\":\"answer-the-question-before-recommending-a-route\",\"file_sha256\":\"541a15182a67f6db59456cd17c2d07d46864a5df897e3e62b58ea8c2028aa956\",\"content_sha256\":\"27a5a2b8acd3b68cc4f11f2d51079c8cff4d8ee3aa1f00fb8aa727788c69e59f\",\"file_bytes\":1600,\"body_bytes\":454},{\"atom_id\":\"read-every-installed-module-before-answering\",\"file_sha256\":\"68fa326811292dfa16afc16a431e844145daf4609f13a9fe20b7903689dbfe6d\",\"content_sha256\":\"36cf8de06b782e911cfd50714ee930e69396cde7e23f973340c4541d4dcff0f4\",\"file_bytes\":1514,\"body_bytes\":438}]"
carrier_sha256: 0b47db0a5fddeb1ff0594c675fd8f9825c0928b0020211eb10bbcdd40add2887
carrier_bytes: 3411
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-the-question-before-recommending-a-route -->
---
instruction_id: answer-the-question-before-recommending-a-route
title: Answer the question before recommending a route
summary: "The answer comes first; the route and its reason follow, and an unanswered question is said to be unanswered rather than guessed."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: You answer a question and could also point at a tool or a procedure that would answer it.
conditions_does_not_apply_when: The question is which procedure to use.
artifact_contract_output_type: answer-with-route
artifact_contract_required_data:
  - the answer
  - the recommended route
  - the reason for the route
artifact_contract_verified_by: "the answer is stated before the route, and an unresolved question is declared unresolved"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad/references/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Answer the question before recommending a route
Answer the question first. Recommend only installed skills, with the reason the module help gives; take routes and order only from the module help.

When the help does not settle the question, go deeper in this order and stop when it does: the file in `topics` for that subject, the skill's own files, then the remote documentation the module help names. If nothing answers it, say so rather than guess.
<!-- vpmodule:atom:end answer-the-question-before-recommending-a-route -->
<!-- vpmodule:atom:begin read-every-installed-module-before-answering -->
---
instruction_id: read-every-installed-module-before-answering
title: Read every installed module before answering
summary: "Another module may change the answer, so the question is answered against all the installed help, not only the one it seems to concern."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: Several modules are installed and the question seems to belong to one of them.
conditions_does_not_apply_when: Only one module is installed.
artifact_contract_output_type: module-scan
artifact_contract_required_data:
  - the modules read
  - the answer and the module it comes from
artifact_contract_verified_by: every installed module was read before the answer was given
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad/references/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read every installed module before answering
The output of `knowledge.py` is your source for every answer. Its `documents` hold the help of each installed module: what its skills are for, how they fit together, and what comes next. Follow every module's document, not only the one the question seems to concern, since another module may change the answer.

A match shows a skill ran, not that its work is finished; ask when it matters.
<!-- vpmodule:atom:end read-every-installed-module-before-answering -->