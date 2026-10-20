---
instruction_id: reach-a-mid-workflow-point-without-a-multi-turn-simulator
title: Reach a mid-workflow point without a multi-turn simulator
summary: "A mid-workflow moment is reached by prefixing the input with the state the skill is in, so one case can play any turn of the flow."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A skill has to be judged at a moment that sits in the middle of its own flow.
conditions_does_not_apply_when: The conversation arc itself is the thing being judged.
artifact_contract_output_type: mid-workflow-case
artifact_contract_required_data:
  - the state the skill is in
  - the moment the case reaches
artifact_contract_verified_by: the case reaches the mid-workflow moment in a single message
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 1
---

# Reach a mid-workflow point without a multi-turn simulator
Most multi-turn skills can be evaluated single-shot if the case is designed right.
The `state_prefix` is the trick that makes mid-workflow points reachable without a multi-turn simulator.
It is a bracketed prime prepended to the input that tells the skill where in its own flow this turn lands and what the user already said:
One input then exercises any mid-workflow moment: a clarifying turn, a correction, a resume after an interruption.
Only a case where the conversation arc itself is the deliverable needs real multi-turn.
