---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-feedback
title: "Give timely, informative feedback"
summary: "Respond within 0.1 seconds for direct manipulation, use progress feedback around one and ten seconds, and dose feedback to context."
capability_tags:
  - design-user-interface
pattern_tags:
  - operational-telemetry
conditions_applies_when: Designing feedback for an action with latency.
conditions_does_not_apply_when: An action with no perceptible delay.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Feedback is immediate, informative and appropriate to the wait."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L154-L178"
status: active
revision: 1
---

# Give timely, informative feedback

Feedback must be immediate (within 0.1s for direct manipulation), informative, appropriately dosed, and non-intrusive. Use visual, auditory, haptic, or progress feedback by context. Around 1s, change the cursor; around 10s, show progress; for longer operations, show percentage and allow backgrounding.
