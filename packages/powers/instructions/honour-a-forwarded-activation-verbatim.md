---
instruction_id: honour-a-forwarded-activation-verbatim
title: Honour a forwarded activation verbatim
summary: "When a caller supplies the intent and the pre-resolved fields, use them as given and resolve only what was not supplied."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A caller invoked the work with a stated intent and pre-resolved fields.
conditions_does_not_apply_when: No caller supplied anything and everything has to be inferred.
artifact_contract_output_type: activation
artifact_contract_required_data:
  - the supplied intent and fields
  - the fields that still had to be resolved
artifact_contract_verified_by: every supplied field was used as given and only the missing ones were resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Honour a forwarded activation verbatim
**Forwarded activation:** if a caller invoked you with a stated intent and pre-resolved customization fields
honor them verbatim — skip your own intent inference, use the supplied values for those named fields, and resolve only the remaining fields from your own
configuration.
