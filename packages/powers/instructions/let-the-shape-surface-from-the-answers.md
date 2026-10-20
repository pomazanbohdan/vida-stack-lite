---
instruction_id: let-the-shape-surface-from-the-answers
title: Let the shape surface from the answers
summary: "The shape of a tool is a conclusion drawn from what the user said, not a menu offered to them."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The form of the thing being built is decided.
conditions_does_not_apply_when: The form was fixed by the user or by the platform.
artifact_contract_output_type: chosen-shape
artifact_contract_required_data:
  - the shape
  - the answers it was drawn from
artifact_contract_verified_by: the shape is named with the reason the conversation led to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/SKILL.md
status: active
revision: 1
---

# Let the shape surface from the answers
The shape surfaces on its own from those answers: a persona with a menu of things it does is an agent; memory across sessions is a memory agent; teams swapping steps without forking is a rendered skill; mostly deterministic work is a script-backed utility; shipping with other skills or needing its own config questions is a module.
The shape of a skill is a conclusion, not a menu.
