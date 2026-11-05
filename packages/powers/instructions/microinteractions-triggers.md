---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-triggers
title: Design discoverable triggers with visible states
summary: "Make every trigger communicate that it exists, what it does and its current state; scale prominence to action stakes; pair hidden gestures with visible alternatives; and never hide a critical trigger without a fallback."
capability_tags:
  - design-microinteraction
pattern_tags:
  - trigger-state
conditions_applies_when: Choosing or reviewing the trigger of a microinteraction.
conditions_does_not_apply_when: A system event with no user-facing control.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each trigger names existence, action and state, and hidden triggers have a visible alternative."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L31-L54"
status: active
revision: 1
---

# Design discoverable triggers with visible states

A trigger initiates a microinteraction and is its 'front door'; it may be manual (tap, click, swipe, voice command) or system-initiated (time, location, incoming data, error state). A trigger must communicate three things: that it exists, what it does, and what state it is in. Trigger prominence and labeling must match action importance -- high-stakes actions need prominent triggers. Invisible triggers (gestures, shake, proximity) must be paired with a visible alternative for discoverability. Trigger states -- default, hover, active, disabled, loading -- must be visually distinct. Prohibition: never hide critical triggers behind gestures or invisible interactions without a visible fallback. Illustrative applications: toggle controls (manual trigger with binary state), pull-to-refresh (hidden gesture with visible affordance, fires past a threshold), system alerts (system trigger on condition met, e.g., low-battery notification at 20%).
