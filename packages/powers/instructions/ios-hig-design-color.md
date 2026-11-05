---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-color
title: Use semantic color and support Dark Mode
summary: "Use semantic system colors, keep 4.5:1 contrast in both appearances, preview light and dark side by side, define custom colors in the asset catalog and test Increase Contrast."
capability_tags:
  - design-ios-interface
pattern_tags:
  - semantic-color
conditions_applies_when: Choosing colors or supporting Dark Mode.
conditions_does_not_apply_when: A single-appearance surface with no color choice.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Both appearances have semantic colors and 4.5:1 contrast evidence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L80-L106"
status: active
revision: 1
---

# Use semantic color and support Dark Mode

Color & Dark Mode: use semantic system colors that adapt between light and dark appearances while preserving contrast and hierarchy: Color(.label) for primary text, Color(.secondaryLabel) for secondary (60% opacity in both modes), Color(.systemBackground)/.secondarySystemBackground for layered backgrounds, Color(.systemRed) for destructive actions, app accent color or .systemBlue for interactive tint. .systemBlue is the default tint, .systemRed marks destructive actions, .systemGreen marks success. Dark Mode inverts text colors and shifts backgrounds darker while keeping relative hierarchy; accent colors need lower brightness and higher saturation. Maintain 4.5:1 contrast in both modes and preview both during development. Use .preferredColorScheme(.light)/(.dark) previews; define custom colors in the Asset Catalog with light/dark variants, not in code; never assume a background is white or black; test with Increase Contrast enabled.
