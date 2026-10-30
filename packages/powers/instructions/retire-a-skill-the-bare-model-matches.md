---
instruction_id: retire-a-skill-the-bare-model-matches
title: Retire a skill the bare model matches
summary: "If the bare model already does what the skill does, the skill is retired or rethought, not patched; a skill that only saves retyping a format, a preference or a convention earns its place on that alone."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A measurement shows the skill adds nothing over the bare model.
conditions_does_not_apply_when: The skill is measured only for triggering.
artifact_contract_output_type: skill-decision
artifact_contract_required_data:
  - the baseline result
  - "the skill's result"
  - the decision
artifact_contract_verified_by: "the decision is recorded as retire or rethink, not patch"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/evals.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/approaches.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Retire a skill the bare model matches
A skill that saves retyping a format, preference or convention is warranted by that alone.
Does the skill beat the bare model on the same input?
A skill the bare model matches should be retired, not patched.
Retire the skill or rethink it
patching a skill the bare model matches is wasted work.
