---
instruction_id: attack-the-shared-premise
title: Attack the shared premise
summary: "When two or more fixes that share one premise have failed the same gate, write the premise down and test it before writing another fix."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: Two or more fixes that share one premise have failed the same gate.
conditions_does_not_apply_when: The premise is already tested and recorded as a requirement.
artifact_contract_output_type: premise-check
artifact_contract_required_data:
  - premise
  - counter-example
  - consequences
  - test method
artifact_contract_verified_by: the premise checked against observed data or code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-attack-the-premise/SKILL.md
status: active
revision: 1
---

# Attack the shared premise
When two or more fixes that share one premise have failed the same gate, suspect the premise, not the fixes.
Each failed fix is evidence against the belief it assumed.
A third fix on the same premise spends effort where the evidence already says the cause is not.
Write the premise down: the one sentence that every failed fix assumed.
Test the premise before the next fix.
Find an observation that would come out differently if the premise were false, and make it.
Look at how the failures are distributed, not only at how large they are.
Make the check rerunnable.
Follow the evidence.
If it contradicts the premise, the cause is elsewhere.
Look for what the failures have in common that the premise did not predict.
If it confirms the premise, ask the next why; the earlier fixes may have treated a consequence instead of the cause.
Remove the condition instead of compensating for it.
If the evidence shows that one part always lands on the losing side, change what puts it there.
A mechanism that cleans up after it leaves the cause in place and adds work on every run.
Do not start the next fix before the premise is written down and tested.
