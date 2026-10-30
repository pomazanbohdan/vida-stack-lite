---
instruction_id: name-the-behaviour-that-must-not-change
title: Name the behaviour that must not change
summary: "The behaviour that has to stay as it is is written under Boundaries and names behaviour, not files."
capability_tags:
  - plan-implementation
pattern_tags:
  - structural-design
conditions_applies_when: A change could damage behaviour that is not part of the change.
conditions_does_not_apply_when: The change touches nothing beside its own new behaviour.
artifact_contract_output_type: boundary-list
artifact_contract_required_data:
  - the behaviour that must not change
  - the damage a valid implementation could cause
artifact_contract_verified_by: each boundary names behaviour and not a file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/story-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the behaviour that must not change
Behavior that must stay as it is goes under Boundaries.
Must not change: [adjacent behavior a valid implementation could damage — name behavior, not files]
