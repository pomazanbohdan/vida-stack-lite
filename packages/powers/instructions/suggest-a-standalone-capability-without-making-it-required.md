---
instruction_id: suggest-a-standalone-capability-without-making-it-required
title: Suggest a standalone capability without making it required
summary: "A capability that belongs to no phase stands alone and is suggested whenever it would help, before, during, after or entirely outside another flow; it is never presented as a required step."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A capability that stands outside any fixed sequence could help with the request in hand.
conditions_does_not_apply_when: The capability is a required step of the sequence being run.
artifact_contract_output_type: capability-suggestion
artifact_contract_required_data:
  - the capability
  - where in the flow it would help
  - that it is optional
artifact_contract_verified_by: the suggestion says when it helps and never says that it must be run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Suggest a standalone capability without making it required
Suggest one whenever it would help: before, during, after, or entirely outside another module's flow.
Each stands alone and works with or without any other module.
Never present one as a required step.
