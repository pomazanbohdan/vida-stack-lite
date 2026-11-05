---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-accessibility
title: Make accessibility first-class
summary: "Give every interactive element a label, value and hint; combine related elements; support Dynamic Type, 44pt targets and 4.5:1 contrast; never convey meaning by color alone and test the full flow with VoiceOver."
capability_tags:
  - design-ios-interface
pattern_tags:
  - ios-accessibility
conditions_applies_when: Every iOS interface.
conditions_does_not_apply_when: "A purely decorative element, which must be hidden."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every task is completable with VoiceOver at the largest text size.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L165-L192"
status: active
revision: 1
---

# Make accessibility first-class

Accessibility: every app must support VoiceOver, Dynamic Type, Switch Control, and Voice Control as first-class concerns; App Store review can reject apps unusable with assistive technologies. Every interactive element needs .accessibilityLabel; use .accessibilityValue for state and .accessibilityHint for effect; group related elements with .accessibilityElement(children: .combine); decorative images get .accessibilityHidden(true). Support Dynamic Type at all sizes and test at the largest setting. The 44x44pt touch target (section 1) and 4.5:1 contrast minimum (section 3) are accessibility requirements, not visual defaults. Never convey meaning through color alone. Labels are nouns ('Favorite', 'Settings'); hints are actions ('Shares this item with others'). Test the complete app flow using only VoiceOver; use Xcode's Accessibility Inspector to audit contrast and labels.
