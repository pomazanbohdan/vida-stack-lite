---
instruction_id: ask-the-shared-configuration-once-and-let-every-member-read-it
title: Ask the shared configuration once and let every member read it
summary: "Ask the shared configuration once, in the record that owns it, and let every member read the answer the same way; a skill belongs to one module and another module's skill is a dependency, not a member."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Several artifacts of yours share the same configuration.
conditions_does_not_apply_when: The configuration belongs to one artifact alone.
artifact_contract_output_type: configuration-contract
artifact_contract_required_data:
  - the configuration questions
  - the owner
  - the readers
artifact_contract_verified_by: every member reads the same answer to the same question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-multi-skill-module.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-single-skill-module.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/single-skill-module/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ask the shared configuration once and let every member read it
Configuration is asked once, in the record, and every member reads the answer the same way.
A skill belongs to one module; one it uses from another module is a dependency, not a member.
A skill with nothing to ask drops the questions block rather than shipping a placeholder question.
Nothing a question could hold is hardcoded.
One question serves every skill that needs the value, so the record is the only place a path is asked.
A second skill arriving later turns this into a multi-skill module: the record moves to its own folder and the member keeps only its own part.
The record's version is not yours to bump.
