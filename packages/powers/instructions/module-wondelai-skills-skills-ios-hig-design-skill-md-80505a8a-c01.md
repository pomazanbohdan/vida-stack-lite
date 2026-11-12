---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ios-hig-design-skill-md-80505a8a-c01"
title: "wondelai-skills: skills/ios-hig-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/ios-hig-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ios-hig-design/SKILL.md\"}"
atom_ids:
  - ios-hig-design-accessibility
  - ios-hig-design-color
  - ios-hig-design-common-mistakes
  - ios-hig-design-controls
  - ios-hig-design-core
  - ios-hig-design-gestures
  - ios-hig-design-icons
  - ios-hig-design-layout
atom_count: 8
atoms: "[{\"atom_id\":\"ios-hig-design-accessibility\",\"file_sha256\":\"e932b03ccde546c0292d59b395d2ddda9bc50868e947bff247c9d61fe534df07\",\"content_sha256\":\"520252ee95a8f61c9ba5e0a0528b3ff0f389997b791c2eda5264534675e75944\",\"file_bytes\":2071,\"body_bytes\":918},{\"atom_id\":\"ios-hig-design-color\",\"file_sha256\":\"881f963458b7c8543cf3299194dc026945834bf6763ab9a25177f2957e8f64d7\",\"content_sha256\":\"23edb06e9f88055d96ab4ecc6f29259bcbd54b26bd62dcef204bdffd9472aa49\",\"file_bytes\":2125,\"body_bytes\":991},{\"atom_id\":\"ios-hig-design-common-mistakes\",\"file_sha256\":\"6b002dd6325a8f14f458f81beaf488c99667c065e322c6a5545fb5e1d630802a\",\"content_sha256\":\"2198a1f7860465acab507d79b361a2184b4f215936fe7eb193afe66664335266\",\"file_bytes\":1988,\"body_bytes\":864},{\"atom_id\":\"ios-hig-design-controls\",\"file_sha256\":\"50a7617583134819c8b630dfe9cd0703650a72efd282903b0aad0f3c569c4390\",\"content_sha256\":\"83fe847f381a578209e50f3ec5e1f25ac5e58760773ec2c2523601fc38890b51\",\"file_bytes\":2118,\"body_bytes\":936},{\"atom_id\":\"ios-hig-design-core\",\"file_sha256\":\"e0bf8fa9c74706fc72fc3ed9b72ea88475559a78355e585a97cce9a9c5d67865\",\"content_sha256\":\"56ba5ed21ff4dcbd305f33023c0bba6a445b559bb3387164ad38cac5837418c7\",\"file_bytes\":1681,\"body_bytes\":529},{\"atom_id\":\"ios-hig-design-gestures\",\"file_sha256\":\"41d0824e934bb7a5cfe3ca719edb213e8a39589279544d65ee570ba5a3a7ee99\",\"content_sha256\":\"71a2004afcf1a3f6ec2fd302d4b3c53815e550e86f056818ecc220566a72dfe6\",\"file_bytes\":1984,\"body_bytes\":813},{\"atom_id\":\"ios-hig-design-icons\",\"file_sha256\":\"156455c9d998beb359254970c5e0c59befe5a71c1bf3aef1c3ea5f4db23a46a3\",\"content_sha256\":\"7323ea5633291d4e7e0fce60d39885e99f6d61397094c747c4a244d429933e2b\",\"file_bytes\":2110,\"body_bytes\":953},{\"atom_id\":\"ios-hig-design-layout\",\"file_sha256\":\"fd68e83146b1323f1081b513ee315a5d7d4466421ea494ae4cc17601320ac0a2\",\"content_sha256\":\"b6553e03b29551dfa2a5e4dc44155b8e9ca45a37022615088f9899750e849d13\",\"file_bytes\":2109,\"body_bytes\":986}]"
carrier_sha256: 4174416659c56788c71a4c04142dbffe7915ed8902ad6222d776f03da7e95d81
carrier_bytes: 17017
revision: 1
status: active
---
<!-- vpmodule:atom:begin ios-hig-design-accessibility -->
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
<!-- vpmodule:atom:end ios-hig-design-accessibility -->
<!-- vpmodule:atom:begin ios-hig-design-color -->
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
<!-- vpmodule:atom:end ios-hig-design-color -->
<!-- vpmodule:atom:begin ios-hig-design-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-common-mistakes
title: Avoid the listed iOS mistakes
summary: "Avoid overriding gestures, sub-44pt targets, ignored safe areas, Android patterns, missing Dark Mode, hardcoded fonts, low contrast and simulator-only testing; apply each fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing an iOS interface for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L248-L260"
status: active
revision: 1
---

# Avoid the listed iOS mistakes

Common mistakes audit table: each row pairs a failure with its fix — overriding standard gestures (fix: use system gestures as intended, custom gestures only for supplementary actions); touch targets under 44pt (fix: minimum 44x44pt interactive elements); ignoring safe areas (fix: respect insets, .ignoresSafeArea() only for backgrounds); using Android patterns on iOS such as hamburger menus, top tabs, FABs (fix: tab bars, bottom sheets, native iOS components); skipping Dark Mode (fix: semantic colors, test both appearances); hardcoding font sizes (fix: semantic text styles throughout); low contrast text (fix: 4.5:1 minimum, test with Increase Contrast); not testing on real devices (fix: test on physical devices at smallest and largest sizes because the simulator misses performance, haptics, and safe-area edge cases).
<!-- vpmodule:atom:end ios-hig-design-common-mistakes -->
<!-- vpmodule:atom:begin ios-hig-design-controls -->
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
<!-- vpmodule:atom:end ios-hig-design-controls -->
<!-- vpmodule:atom:begin ios-hig-design-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-core
title: "Apply clarity, deference and depth"
summary: "Design native iOS interfaces on Apple's three pillars: clarity for legible, purposeful elements; deference so the interface never overshadows content; depth through layering and realistic motion."
capability_tags:
  - design-ios-interface
pattern_tags:
  - ios-platform-idiom
conditions_applies_when: Designing or reviewing a native iOS interface.
conditions_does_not_apply_when: A cross-platform design with no iOS-specific surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design names clarity, deference and depth decisions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L14-L19"
status: active
revision: 1
---

# Apply clarity, deference and depth

iOS design rests on three pillars: clarity (every element legible and purposeful), deference (the interface never overshadows the content it presents), and depth (layering, transitions, and realistic motion convey hierarchy and spatial relationships). The governing rule: the best iOS apps internalize this philosophy rather than applying HIG rules mechanically; native components, system conventions, and platform consistency are the reason iOS users trust apps that feel like they belong.
<!-- vpmodule:atom:end ios-hig-design-core -->
<!-- vpmodule:atom:begin ios-hig-design-gestures -->
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
<!-- vpmodule:atom:end ios-hig-design-gestures -->
<!-- vpmodule:atom:begin ios-hig-design-icons -->
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
<!-- vpmodule:atom:end ios-hig-design-icons -->
<!-- vpmodule:atom:begin ios-hig-design-layout -->
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
<!-- vpmodule:atom:end ios-hig-design-layout -->