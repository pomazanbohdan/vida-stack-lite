---
instruction_id: mine-the-conversation-before-you-ask
title: Mine the conversation before you ask
summary: "The request, the steps already taken, the corrections and the shown inputs are read first, and only the gaps are asked about."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - bounded-artifact-reading
conditions_applies_when: A tool or a skill is built from an existing request or conversation.
conditions_does_not_apply_when: Nothing has been said yet and there is nothing to read.
artifact_contract_output_type: mined-input
artifact_contract_required_data:
  - the request
  - the steps already taken
  - the corrections made
  - the inputs and outputs shown
  - the gaps that remain
artifact_contract_verified_by: the questions asked cover only the gaps the conversation and the files do not answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/assets/sample-skill/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Mine the conversation before you ask
Read what the user already gave you: the request, the conversation so far (tools used, the order of steps, corrections they made, inputs and outputs they showed), files or skills they pointed at. When the conversation itself is the workflow ("turn this into a skill"), most answers are in it. Ask only for the gaps.
Ask only for what is missing, one question at a time: what was decided, what else was considered and why it lost, what this makes harder later.
