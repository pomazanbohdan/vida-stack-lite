---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-gestures
title: Preserve gestures and use meaningful haptics
summary: "Never override edge-swipe back, modal swipe-down or pull-to-refresh; use swipe actions and long-press menus as expected; use impact, notification and selection haptics subtly and prepare before firing."
capability_tags:
  - design-ios-interface
pattern_tags:
  - ios-gesture-haptic
conditions_applies_when: "Wiring gestures, animation or haptic feedback."
conditions_does_not_apply_when: A screen with no gesture or haptic.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Reserved gestures are intact and haptics match action type and frequency.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L221-L247"
status: active
revision: 1
---

# Preserve gestures and use meaningful haptics

iOS standard gestures must be respected and never overridden because they are muscle memory: never override swipe-right-from-edge (back), swipe-down on a modal (dismiss), or pull-down on a list (refresh). Swipe-left on rows reveals actions, long press shows context menus, and pinch zooms images and maps. Three haptic types exist: impact (physical actions), notification (outcomes), selection (UI changes); haptics must be subtle and meaningful, never constant or annoying. Implementation: UIImpactFeedbackGenerator(style: .medium) for physical interactions, UISelectionFeedbackGenerator() for UI state changes, UINotificationFeedbackGenerator() with .success/.warning/.error for outcomes, and always call .prepare() before triggering haptics to minimize latency.
