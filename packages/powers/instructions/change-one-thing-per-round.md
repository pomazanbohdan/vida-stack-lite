---
instruction_id: change-one-thing-per-round
title: Change one thing per round
summary: "One change per round, small enough that the next evaluation can attribute the delta to it; a round that regresses anything is reverted."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A round of an automatic loop applies a change that is then measured.
conditions_does_not_apply_when: The change is a single edit with nothing else in it.
artifact_contract_output_type: round-change
artifact_contract_required_data:
  - the single change of the round
  - the score it moved
  - the revert reason when it regressed
artifact_contract_verified_by: the delta of the round is attributable to the one change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 1
---

# Change one thing per round
Keep the change small enough that the next eval can attribute the delta to it; a round that rewrites five things at once cannot tell you which one moved the score.
A round that improves the score and breaks nothing else is kept; a round that regresses any mode is reverted before the next round, because an applied change that made things worse is not a base to build on.
