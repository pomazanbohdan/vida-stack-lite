---
instruction_id: cluster-raw-data-by-what-differentiates-behavior
title: Cluster raw data by what differentiates behavior
summary: "Compress source material into representative personas by the traits that change behaviour, and say which split you used."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: "The user hands over raw material — a table, a set of profiles, exported notes — that has to become a small set of representatives."
conditions_does_not_apply_when: The material already names the groups and only has to be formatted.
artifact_contract_output_type: persona-clusters
artifact_contract_required_data:
  - the clusters
  - the traits that drove the split
  - the number of personas
  - the reasoning
artifact_contract_verified_by: the split is made on behaviour and the user is told which traits drove it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/create-party.md
status: active
revision: 1
---

# Cluster raw data by what differentiates behavior
When the user points you at data — a file path, a pasted table, exported profiles — read it and compress it into the requested number of representative personas.
Cluster by what actually differentiates behavior (goals, budget, pains, adoption posture), not surface demographics alone.
Each cluster becomes one persona with a real name and face.
Name your reasoning: tell the user which segments you found and which traits drove the split, so they can correct the cut before you flesh the personas out.
If they didn't say how many, propose a number from the spread in the data and let them adjust.
