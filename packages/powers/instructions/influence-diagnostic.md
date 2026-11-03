---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-diagnostic
title: Run the influence ethics diagnostic
summary: "Audit principles, combination, truthfulness, user benefit, transparency, reversibility and safety for vulnerable users."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a persuasive element.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and corrects every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L289-L302"
status: active
revision: 1
---

# Run the influence ethics diagnostic

Answer each question and apply its action: Which principles am I using? If none, design for influence explicitly. Am I combining principles? If not, layer multiple principles where truthful. Is the claim truthful? If not, remove or replace it. Does it help the user? If not, realign it with the user's goal. Would it still work if the user knew the strategy? If not, replace it with a transparent version. Can users easily reverse the decision? If not, add clear opt-outs. Is it safe for vulnerable users? If not, apply the safeguards or exclude them. Report each failed check and its correction.
