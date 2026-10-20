---
instruction_id: fix-the-description-not-the-eval
title: "Fix the description, not the eval"
summary: "A routing check is a lexical approximation: it catches a description that misses the vocabulary users say and a description so broad it outranks the right skill, and both are fixed in the description."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger check fails to route a realistic prompt to its skill.
conditions_does_not_apply_when: The check fails for a reason the description cannot cause.
artifact_contract_output_type: description-fix
artifact_contract_required_data:
  - the prompt that failed to route
  - the vocabulary the description lacked
  - the changed description
artifact_contract_verified_by: the changed description makes the realistic prompt rank the skill first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ship.md
status: active
revision: 2
---

# Fix the description, not the eval
The routing check
is a **lexical approximation** of routing (stemmed TF-IDF over descriptions). It cannot judge semantics — that's the behavioral tier's job — but it catches the two failure modes that dominate real trigger bugs: a description missing the vocabulary users say (false negative), and an over-broad description that outranks the right skill (false positive).
A routing-check failure
usually means *fix the description*, not the eval.
If a realistic prompt can't rank because the description lacks its vocabulary, that is a real finding — improve the description.

When the description is revised from failures, change its contexts and anchors, never paste a failed query's words into it.
