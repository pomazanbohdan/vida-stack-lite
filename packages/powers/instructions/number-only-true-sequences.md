---
instruction_id: number-only-true-sequences
title: Number only true sequences
summary: "Numbering says order matters, so it is used only where steps feed each other; independent steps are bullets."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - completion-criteria
conditions_applies_when: Steps of an instruction are laid out as a list.
conditions_does_not_apply_when: The steps are already an ordered procedure with no choice.
artifact_contract_output_type: step-list
artifact_contract_required_data:
  - the steps that feed each other
  - the independent steps
artifact_contract_verified_by: "every numbered step depends on the one before it, and the independent ones are bullets"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 1
---

# Number only true sequences
Number only true sequences. Numbering says order matters, so the model marches. Number steps that feed each other; bullet independent ones; steps that were never separate are one goal sentence.
Numbered lists that are not sequences: independent steps the model will march through. Minor; the recommendation holds the goal sentence that replaces them. A sequence guarding a named failure stays.
