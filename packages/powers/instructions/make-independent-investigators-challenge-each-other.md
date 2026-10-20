---
instruction_id: make-independent-investigators-challenge-each-other
title: Make independent investigators challenge each other
summary: "When several causes fit the same symptoms, the investigators have to be able to contradict each other, and the group converges only on a cause two of them agree they can disprove."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Several causes fit the same symptoms and the wrong cause is expensive.
conditions_does_not_apply_when: "One cause is already established, or the artifact is known and a verdict is what is wanted."
artifact_contract_output_type: converged-root-cause
artifact_contract_required_data:
  - the hypotheses
  - the counter-evidence each investigator produced
  - the hypothesis that survived
artifact_contract_verified_by: two investigators independently ruled out the hypotheses that were discarded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
status: active
revision: 1
---

# Make independent investigators challenge each other
A single agent will pick the first plausible theory and stop investigating.
A subagent fan-out would have each persona report independently — but their reports never meet, so nothing rules out the wrong theories.
With multiple independent investigators actively trying to disprove each other, the theory that survives is much more likely to be the actual root cause.
Update findings as consensus emerges. Only converge when two teammates agree they can disprove the others'.
The lead synthesizes the converged finding and presents it to you.
Reach for agent teams only when teammates **need** to challenge each other to produce the right answer.
