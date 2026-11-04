---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-follow-up
title: Run the follow-up cadence
summary: "Follow up on Day 3, send a different-angle follow-up on Day 7, a break-up email on Day 14 and a re-engagement on Day 30."
capability_tags:
  - design-sales-motion
pattern_tags:
  - follow-up-cadence
conditions_applies_when: Running an outbound sequence.
conditions_does_not_apply_when: A single email with no follow-up.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The sequence states each day, angle and stop condition."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L79-L90"
status: active
revision: 1
---

# Run the follow-up cadence

Use the follow-up cadence: send the referral email on Day 1; follow up on Day 3 if there is no response; send a second follow-up with a different angle on Day 7; send a break-up email on Day 14; and re-engage on Day 30 with a new trigger event or content. The break-up email often draws the sequence's highest response, attributed to scarcity.
