---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-feedback
title: "Give immediate, proportional feedback"
summary: "Deliver feedback under 100ms for direct manipulation, use the least noticeable signal that communicates, scale it to event significance, keep visual primary and audio or haptic supplementary, prefer honest progress, and never fake completion."
capability_tags:
  - design-microinteraction
pattern_tags:
  - response-timing
conditions_applies_when: Choosing feedback for an interaction.
conditions_does_not_apply_when: A background process with no user-visible effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Direct feedback is within 100ms and its strength matches the event.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L79-L103"
status: active
revision: 1
---

# Give immediate, proportional feedback

Feedback must let users tell whether their action registered and the system is working by communicating what is happening now through visual channels such as color, animation, and movement, aural channels such as clicks and chimes, or haptic channels such as vibration; show only what matters: minimal, meaningful, and contextual. Feedback must be immediate, under 100ms for direct manipulation; use the least noticeable feedback that still communicates, prefer animating existing elements such as the button itself over a separate toast, scale feedback to event significance, keep visual feedback primary with audio and haptics supplementary and never the only channel, and use progress indicators because they reduce perceived wait even when actual wait is unchanged. Feedback must be honest: no fake progress bars, manipulative countdowns, or deceptive completion percentages. Representative cases include button state changes, inline validation as the user types, and contextual errors near the source.
