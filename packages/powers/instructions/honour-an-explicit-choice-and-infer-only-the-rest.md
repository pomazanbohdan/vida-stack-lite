---
instruction_id: honour-an-explicit-choice-and-infer-only-the-rest
title: Honour an explicit choice and infer only the rest
summary: "A forwarded intent, type or pre-resolved setting is used verbatim; inference fills the values that were not given, and a genuinely ambiguous case is confirmed."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The caller supplied a value that pins part of the work.
conditions_does_not_apply_when: Nothing was supplied and the work is free to choose its own shape.
artifact_contract_output_type: honoured-choice
artifact_contract_required_data:
  - the values supplied
  - the values inferred
  - the ambiguity confirmed
artifact_contract_verified_by: no supplied value was overridden and no unambiguous case was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 1
---

# Honour an explicit choice and infer only the rest
**Forwarded activation:** if a caller invoked you with a stated intent, research type, or pre-resolved customization fields
- honor them verbatim — skip your own inference for those values and resolve only the rest.
Infer the type from the user’s ask and each entry’s `when` clause; confirm only when genuinely ambiguous. An explicit type (argument, shim, menu) wins without discussion.
