---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-hypothesis-statements
title: Write testable hypothesis statements
summary: "Name the persona, action, outcome and measurable signal, split large bets and predefine validation criteria."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Turning an assumption into a test.
conditions_does_not_apply_when: A prediction that cannot be measured or falsified.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - hypothesis
  - signal
  - criteria
artifact_contract_verified_by: The hypothesis names a measurable signal and criteria fixed before the test.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L56-L79"
status: active
revision: 1
---

# Write testable hypothesis statements

Translate assumptions into testable predictions naming persona, action, outcome, measurable signal; split large bets and predefine validation criteria. Do not cherry-pick metrics afterward.
