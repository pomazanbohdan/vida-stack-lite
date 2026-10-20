---
instruction_id: prefer-the-word-the-model-already-holds
title: Prefer the word the model already holds
summary: A term the model met in training arrives with its meaning attached; a coined term pays its definition on every use.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - concise-communication
conditions_applies_when: A word is chosen for an instruction or a document.
conditions_does_not_apply_when: The domain has no established word and the coinage is the term of art.
artifact_contract_output_type: chosen-term
artifact_contract_required_data:
  - the term chosen
  - the meaning it carries with it
artifact_contract_verified_by: the same word is used unchanged everywhere it appears
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 1
---

# Prefer the word the model already holds
A term the model met in training arrives with its meaning attached: idempotent, read-back, dry run. Choose it over a coined term, which costs its definition on every use, and over a run of adjectives that circle it. Having chosen the word, reuse it as it is; each paraphrase spends tokens and loosens the meaning. A term only this skill uses is a sign the plain word was not looked for.
A prohibition where a positive form says the same, or a coined term and adjective runs where one word the model knows would do:
- Minor
- recommend the positive sentence or the word
