---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-score
title: Score the messaging
summary: "Score marketing copy by the seven diagnostic rows plus up to three points for a one-liner; report the score band, failed rows and changes to reach 10/10."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing marketing copy.
conditions_does_not_apply_when: A narrow visual review that does not assess messaging.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - improvement-list
artifact_contract_verified_by: "The report states the score band, the failed diagnostic rows and the changes needed for 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L18-L20"
status: active
revision: 1
---

# Score the marketing copy

Score by the Quick Diagnostic: 1 point per satisfied row (7 rows) plus up to 3 points for a one-liner that passes the cocktail-party test (clear and repeatable after one hearing). Bands: 9–10 = customer is the hero, all three problem levels are named, empathy and authority are both shown, a three-step plan, one obvious Direct CTA, and both success and failure stakes are painted; 5–6 = SB7 is partly applied but the internal problem, stakes or CTA is missing; ≤3 = brand-as-hero, feature-led, or no clear ask. State the current score, the failed diagnostic rows and the specific changes needed to reach 10/10.
