---
instruction_id: keep-sibling-descriptions-from-colliding
title: Keep sibling descriptions from colliding
summary: "Two skills that do the same kind of work must not describe it the same way: the pairwise description similarity is checked and a near-collision is an error."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Two skills in the same catalogue do the same kind of work.
conditions_does_not_apply_when: The catalogue holds one skill.
artifact_contract_output_type: collision-check
artifact_contract_required_data:
  - the pair of descriptions compared
  - the similarity
  - the verdict
artifact_contract_verified_by: no two descriptions near-collide
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep sibling descriptions from colliding
What neither provides is a **deterministic, CI-safe** check for a multi-skill *catalog* — does each skill's description carry the vocabulary users actually say, and do two skills' descriptions collide?
The collision check errors at ≥75% pairwise description similarity and warns at ≥50%.
Positive prompts rank their skill top-k; negative prompts don't; no two descriptions near-collide.
