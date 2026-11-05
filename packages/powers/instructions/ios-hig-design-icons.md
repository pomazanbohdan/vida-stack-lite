---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-icons
title: Use SF Symbols and correct app icons
summary: "Use SF Symbols for standard icons so they scale with text, export a 1024px square app icon for the system squircle mask, provide light, dark and tinted variants, and never imply nonexistent functionality."
capability_tags:
  - design-ios-interface
pattern_tags:
  - sf-symbols
conditions_applies_when: Choosing icons or exporting an app icon.
conditions_does_not_apply_when: A brand mark that is not an interface icon.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Icons are SF Symbols and the app icon follows the export and variant rules.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L193-L220"
status: active
revision: 1
---

# Use SF Symbols and correct app icons

Use SF Symbols (Image(systemName:)) for all standard icons because they align optically with San Francisco text and scale with Dynamic Type, staying crisp at every weight and size. App icons must be exported as 1024x1024px squares; iOS applies the superellipse ('squircle') mask automatically with corner radius = side x 0.222 and 61% smoothing. iOS 18+ supports light, dark and tinted icon variants. Avoid text in app icons and keep designs simple with recognizable silhouettes. Context rules: tab bar uses SF Symbols with the filled variant for the selected tab; navigation bar uses regular weight; list accessories use secondary color. Use .symbolRenderingMode(.hierarchical) for multi-color depth and size symbols relative to text via .imageScale(.large) or .font(). Ethical boundary: never use icons that suggest functionality that does not exist or contradict iOS conventions (trash = delete, not archive).
