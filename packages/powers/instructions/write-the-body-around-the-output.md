---
instruction_id: write-the-body-around-the-output
title: Write the body around the output
summary: "The body says what the skill produces, for whom and what must be true of the output, with exact steps only where a wrong move costs something; when to use it lives in the description alone."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The body of a skill has to be written.
conditions_does_not_apply_when: Only the description is being changed.
artifact_contract_output_type: agent-skill-body
artifact_contract_required_data:
  - what the skill produces
  - for whom
  - what must be true of the output
artifact_contract_verified_by: a reader can tell from the body alone what the skill produces and what a finished output looks like
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-plain-skill.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-progressive-disclosure.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-description.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the body around the output
The body says what the skill produces, for whom, and what must be true of the output, with exact steps only where a wrong move costs something.
The description is the only place "when to use" lives; the body never repeats it.
Nothing in the body helps with that decision.
