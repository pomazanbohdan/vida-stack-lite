---
instruction_id: load-a-route-file-only-when-its-branch-is-reached
title: Load a route file only when its branch is reached
summary: "One route file at a time: a file is loaded when its branch fires, never ahead of the conversation that needs it."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
  - bounded-artifact-reading
conditions_applies_when: A document is split into route files or reference files.
conditions_does_not_apply_when: The whole document is small enough to load at once.
artifact_contract_output_type: route-loading
artifact_contract_required_data:
  - the branch that fired
  - the file loaded for it
artifact_contract_verified_by: no file is loaded before the branch that needs it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-architecture.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load a route file only when its branch is reached
One route file at a time. Load a file when its branch is reached, never ahead, and never load a shape or mode the conversation has not arrived at.
A route or step file loaded ahead of its branch:
- Important; the model pays for text it may never need
A step must not load or read future step files until the current step is complete. Load each step when it is reached.
