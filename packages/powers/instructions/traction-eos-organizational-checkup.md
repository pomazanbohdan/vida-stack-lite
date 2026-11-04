---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-organizational-checkup
title: Run the organizational checkup
summary: "Rate the company 1-5 on six statements about leadership agreement, right people, scorecard, process, rocks and meeting rhythm."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing organizational health.
conditions_does_not_apply_when: A financial audit.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states each statement's rating and the resulting gaps."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L211-L225"
status: active
revision: 1
---

# Run the organizational checkup

Rate the company from 1-5 on each of six statements: leadership agreement on direction and how to get there; right people in right seats; management from a weekly scorecard of 5-15 numbers; solving issues quickly and permanently; core processes documented and followed by all; and setting and achieving 90-day rocks. Total 25-30 is strong (fine-tune), 20-24 good (close gaps), 15-19 average (significant work), and below 15 weak (consider an EOS Implementer).
