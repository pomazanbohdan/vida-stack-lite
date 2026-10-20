---
instruction_id: retire-the-skill-when-it-stops-beating-the-bare-model
title: Retire the skill when it stops beating the bare model
summary: "The bare model is the floor a skill has to beat; the day it stops beating it, the answer is retirement, not another patch."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A skill is kept or retired on the strength of the results it produces.
conditions_does_not_apply_when: The skill does something the bare model cannot do at all.
artifact_contract_output_type: retirement-decision
artifact_contract_required_data:
  - the skill result
  - the bare-model result
  - the decision
artifact_contract_verified_by: the decision names the comparison the skill lost or won
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/SKILL.md
status: active
revision: 1
---

# Retire the skill when it stops beating the bare model
Run the case input twice in parallel in the same turn, once wrapped by the skill and once against the bare model with nothing around it.
The bare-model run is the long-term floor.
The skill earns its existence only by producing something the bare model cannot, so when the skill stops beating the bare model the right call is retirement, not another patch.
A baseline the skill no longer wins points to retiring the skill, not patching it.
Use baseline when the user asks whether the skill is worth keeping, or as the release check.
