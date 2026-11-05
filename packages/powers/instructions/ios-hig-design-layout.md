---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-layout
title: Respect layout and safe areas
summary: "Design for the smallest screen first, keep interactive content out of safe-area intrusions, use 16-20pt margins and 8/16/24 spacing, and make every touch target and list row at least 44pt."
capability_tags:
  - design-ios-interface
pattern_tags:
  - ios-safe-area
conditions_applies_when: Laying out iOS screens.
conditions_does_not_apply_when: A non-interactive background image.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Safe areas, margins, spacing and 44pt targets are checked on small and large devices."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L26-L52"
status: active
revision: 1
---

# Respect layout and safe areas

Layout & safe areas: every layout must respect device screen dimensions, safe area insets, and hardware intrusions (notch, Dynamic Island, home indicator). Design for the smallest screen first (375pt width, iPhone SE). Never place interactive elements under the notch, Dynamic Island, or home indicator. Standard content margins are 16-20pt from screen edges; spacing increments are 8/16/24pt. Minimum touch target and list row height is 44pt. Reference chrome dimensions: status bar 20pt classic / 44-54pt on Dynamic Island devices; navigation bar 44pt standard row plus ~52pt large title (~96pt total); tab bar 49pt translucent with blur for 2-5 primary destinations; home indicator 34pt bottom inset; content area flexible, scrollable, safe-area-respecting. Use VStack which respects safe areas by default; use .ignoresSafeArea() only for backgrounds and decoration, never interactive content; test on multiple sizes including iPhone SE and Pro Max.
