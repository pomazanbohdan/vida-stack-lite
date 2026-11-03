---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-score
title: Score persuasive elements with the ethics gate
summary: "Score the persuasive element against the 9-10/7-8/5-6/≤3 bands, apply the ethics gate and report the change needed."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a persuasive element.
conditions_does_not_apply_when: A non-persuasive interface review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-criteria
  - improvement-list
artifact_contract_verified_by: "The report states the score band, the failed criteria and the change needed; deceptive tactics cap it at 3."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L18-L25"
status: active
revision: 1
---

# Score the persuasive element

Run the Quick Diagnostic, then score against the bands: 9–10 = multiple principles deliberately layered, every claim truthful, users can reverse the decision, passes the transparency test, safe for vulnerable users; 7–8 = principles layered and honest but one gap; 5–6 = one principle present but generic, or leverage left on the table; ≤3 = no principle deliberately designed, or any deceptive/coercive tactic. Fabricated proof, fake scarcity or hidden-cost dark patterns cap the score at 3. State the current score, the failed criteria and the specific change needed to reach 10/10.
