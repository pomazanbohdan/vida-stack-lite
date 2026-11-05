---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-controls
title: Prefer native controls
summary: "Use native buttons, lists, toggles, pickers, menus and fields; match keyboard type and text content type, put page actions in bars, confirm irreversible destructive actions and keep ads out of native-looking controls."
capability_tags:
  - design-ios-interface
pattern_tags:
  - native-control
conditions_applies_when: "Building forms, settings, selection or actions."
conditions_does_not_apply_when: A platform control with no native equivalent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Controls, keyboard types and destructive confirmations follow native conventions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L133-L164"
status: active
revision: 1
---

# Prefer native controls

Prefer native iOS controls (buttons, lists, toggles, pickers, menus, text fields) because they ship with built-in accessibility, haptics and learned interaction patterns; custom controls create friction. Page-level actions go in the navigation bar (top) or action bar (bottom); primary buttons are filled with the theme color while secondary buttons are outlined or text-only; destructive actions use red and require confirmation when irreversible; grouped lists are the fundamental content pattern. Match keyboard type to input (.emailAddress, .phonePad, .URL) and pair .keyboardType with .textContentType for autofill; place primary action buttons at the bottom of the screen within thumb reach; prefer system confirmations via .alert() or .confirmationDialog() and .swipeActions on list rows. Ethical boundary: never disguise ads as native controls or make destructive actions easy to trigger accidentally.
