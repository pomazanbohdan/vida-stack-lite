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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/customize/run-multi-agent-discussions.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Make independent investigators challenge each other
A single agent will pick the first plausible theory and stop investigating.
A subagent fan-out would have each persona report independently — but their reports never meet, so nothing rules out the wrong theories.
With multiple independent investigators actively trying to disprove each other, the theory that survives is much more likely to be the actual root cause.
Update findings as consensus emerges. Only converge when two teammates agree they can disprove the others'.
The lead synthesizes the converged finding and presents it to you.
Reach for agent teams only when teammates **need** to challenge each other to produce the right answer.
One model voicing five personas tends to make them agree.
Separate agents keep their reasoning independent, which is the point of a review panel or a focus group, at a higher cost.
