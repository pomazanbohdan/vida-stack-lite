---
instruction_id: truncate-before-you-delete
title: Truncate before you delete
summary: "Most long lines hide a needed nudge wrapped in explanation, so the instruction and one clause of why are kept before the line is cut."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: A long line of an instruction is considered for removal.
conditions_does_not_apply_when: The line is short and already only the instruction.
artifact_contract_output_type: truncated-line
artifact_contract_required_data:
  - the instruction that survives
  - the one clause of why that survives
artifact_contract_verified_by: the shortened line still carries the nudge and the reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/cut-roles.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Truncate before you delete
Truncate before you delete. Most long lines hide a needed nudge wrapped in explanation. Keep the instruction and the one clause of why.
Work at every scale: a sentence the model does not need, the words inside a sentence that carry nothing, a passage that a few load-bearing words can replace. There is no token target; leave a lean file as it is.
