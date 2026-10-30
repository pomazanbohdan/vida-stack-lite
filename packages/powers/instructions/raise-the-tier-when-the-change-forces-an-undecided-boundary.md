---
instruction_id: raise-the-tier-when-the-change-forces-an-undecided-boundary
title: Raise the tier when the change forces an undecided boundary
summary: "Size alone does not raise the tier: a change needs the heavier path when it forces a decision the existing patterns do not cover - a new boundary between components, a schema migration strategy, new authorization rules."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A change turns out to need a decision the codebase does not already make.
conditions_does_not_apply_when: The change follows an established pattern.
artifact_contract_output_type: tier-decision
artifact_contract_required_data:
  - the uncovered decision
  - the tier the change needs
artifact_contract_verified_by: "the heavier path was chosen because of the uncovered decision, not because of the size"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/existing-codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Raise the tier when the change forces an undecided boundary
Size alone does not.
when it forces a decision the existing patterns do not cover: a new boundary between components, a schema migration strategy, new authorization rules.
The user can also state such a decision in the intent
It is the default, and risky or foundational stories belong here because a human approves the plan.
