---
instruction_id: keep-the-human-as-the-judge
title: Keep the human as the judge
summary: "The benchmark is a guardrail, never the judge; a green run means the change cleared the bar it was given, and the human decides whether it is right."
capability_tags:
  - verify-work-results
pattern_tags:
  - approval-policy
conditions_applies_when: An automated loop applies changes and reports that a run went green.
conditions_does_not_apply_when: A human has already judged the result.
artifact_contract_output_type: judgement-handover
artifact_contract_required_data:
  - the bar the run cleared
  - the findings the evidence could not confirm
  - the fix and the evidence handed back
artifact_contract_verified_by: the run is reported as a cleared bar and not as a correct change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 1
---

# Keep the human as the judge
The benchmark is a guardrail, never the judge. The human stays the judge.
A green run means the change cleared the bar the loop was given, not that the change is correct, and the loop's job is to do the mechanical iteration a human would otherwise do by hand and then hand back a fix plus the evidence for it.
The review says what looks wrong; the eval says whether it measurably is. A finding the eval cannot confirm is a candidate to note for a human, not to auto-fix.
