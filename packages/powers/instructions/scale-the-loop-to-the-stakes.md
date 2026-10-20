---
instruction_id: scale-the-loop-to-the-stakes
title: Scale the loop to the stakes
summary: "The loop is opt-in, its aggressiveness follows the stakes, and the round bound and the pass condition are agreed with the user before the first round."
capability_tags:
  - design-experiments
pattern_tags:
  - resource-bounds
conditions_applies_when: An automated loop is set up to change something over several rounds.
conditions_does_not_apply_when: The loop runs against a throwaway artefact that is already agreed.
artifact_contract_output_type: loop-terms
artifact_contract_required_data:
  - the round bound
  - the pass condition
  - the length of the bar
artifact_contract_verified_by: the bound and the pass condition were agreed before the first round and are written into the run report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 1
---

# Scale the loop to the stakes
The loop is opt-in. It never starts on its own, because applying changes to a skill in a loop is a stronger action than reporting findings, and the user decides when that is warranted.
Calibrate the aggressiveness to the stakes.
A throwaway skill the user is still shaping can take a longer loop and a looser bar, because a wrong iteration costs little and is easy to throw away.
A skill that other skills already depend on, or one that is shipped and in use, takes a short loop, a strict pass bar, and a close human read of every applied change, because a regression there propagates.
Agree the round bound and the pass condition with the user before the first round, and write both into the run report so the run is auditable against the terms it was given.
Stop when the pass condition is met or the round bound is reached, whichever comes first. The bound is a hard stop: hitting it without passing ends the loop and reports the best state reached, it does not earn extra rounds.
