---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-big-and-little-hire
title: Measure the Big Hire and the Little Hire
summary: "Distinguish the one-time purchase decision from the repeated decision to use, and measure both."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Choosing product metrics for acquisition and ongoing use.
conditions_does_not_apply_when: A one-off transaction with no repeated use decision.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - big_hire
  - little_hire
artifact_contract_verified_by: The design measures purchase and repeated use as separate decisions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L92-L117"
status: active
revision: 1
---

# Measure the Big Hire and the Little Hire

Two distinct decision moments: the Big Hire (purchase/signup, happens once) and the Little Hire (decision to use in the moment, happens repeatedly). Winning the Big Hire does not guarantee the Little Hire.
