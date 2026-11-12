---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ios-hig-design-skill-md-80505a8a-c02"
title: "wondelai-skills: skills/ios-hig-design/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/ios-hig-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ios-hig-design/SKILL.md\"}"
atom_ids:
  - ios-hig-design-navigation
  - ios-hig-design-quick-diagnostic
  - ios-hig-design-score
  - ios-hig-design-typography
atom_count: 4
atoms: "[{\"atom_id\":\"ios-hig-design-navigation\",\"file_sha256\":\"bcd29a84fc36bdc37f50f02b9f0e7e58915ac747f9b4dbcb312ee52f9f42735d\",\"content_sha256\":\"c046d66b55216104ff0482aff8c9365305e4eff6e3bfc1e023cd072ce9783e5f\",\"file_bytes\":2033,\"body_bytes\":912},{\"atom_id\":\"ios-hig-design-quick-diagnostic\",\"file_sha256\":\"0f2d1859f7b07489cf380efc405d3152e6a2da51df728d53a461524d272a2d8c\",\"content_sha256\":\"ca82571e7e32e12487bf6f22dffde2ffa811a64463699d031af4eb88c94ac806\",\"file_bytes\":1997,\"body_bytes\":848},{\"atom_id\":\"ios-hig-design-score\",\"file_sha256\":\"e807598d54672896407eeb15d94612970835b834958f5ddcc5f7b1115d905f29\",\"content_sha256\":\"83cc38de1d6dc00ebc1f0b10ea43bd2edc86de8d6c59d45beab0ca923aba549c\",\"file_bytes\":1786,\"body_bytes\":684},{\"atom_id\":\"ios-hig-design-typography\",\"file_sha256\":\"3548618d26082d68b0d6e2ae7465b7368e418aea5d4e1b08bbf20ea0f9549a81\",\"content_sha256\":\"86c0ba8a1a9f0f7007ef1bcc31c4e4d049355ae51bcbfe4dfc99abeb3869084c\",\"file_bytes\":2047,\"body_bytes\":936}]"
carrier_sha256: a51a579776167f9998edb9fce60cba6efb5a3a7444b5d21769b309c434eeb326
carrier_bytes: 8296
revision: 1
status: active
---
<!-- vpmodule:atom:begin ios-hig-design-navigation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-navigation
title: Use native navigation patterns
summary: "Use 2-5 always-visible tab destinations, navigation stacks for drill-down and modals for focused tasks; never use hamburger menus and use NavigationStack rather than NavigationView."
capability_tags:
  - design-ios-interface
pattern_tags:
  - ios-navigation
conditions_applies_when: Structuring iOS navigation.
conditions_does_not_apply_when: A single-screen utility with no navigation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The app uses tab, stack and modal patterns without foreign navigation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L107-L132"
status: active
revision: 1
---

# Use native navigation patterns

Navigation patterns: iOS uses a layered model — tab bars for primary destinations, navigation stacks for hierarchical drilling, modals for focused tasks — and users rely on these patterns to know where they are and how to get back. Tab bar: 2-5 primary destinations, always visible, remembers state per tab. Navigation bar: back button top-left, title center or large, actions top-right; large title collapses on scroll. Modals are for focused tasks and dismiss via swipe-down or an explicit close button. Never use hamburger menus — iOS users expect tab bars. Search bar can sit below the nav bar, hidden until pulled down. Split view (sidebar + detail) applies on iPad (Mail, Notes). Copy rules: back button text is the previous screen's title, not 'Back'; tab labels are single words; modal titles describe the task; use NavigationStack, not deprecated NavigationView.
<!-- vpmodule:atom:end ios-hig-design-navigation -->
<!-- vpmodule:atom:begin ios-hig-design-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-quick-diagnostic
title: Run the iOS diagnostic
summary: "Check safe areas, 44pt targets, Dark Mode, Dynamic Type, VoiceOver task completion and native navigation; apply the listed action for each no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of an iOS interface.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L261-L273"
status: active
revision: 1
---

# Run the iOS diagnostic

Six-question audit for any iOS interface, with the corrective action for each no: (1) does the layout respect safe areas on all device sizes? If no: audit on iPhone SE and Pro Max and fix insets. (2) Are all touch targets at least 44 x 44pt? If no: increase tap areas with a 44pt minimum frame. (3) Does the app work fully in Dark Mode? If no: replace hardcoded colors with semantic system colors. (4) Does text scale properly with Dynamic Type? If no: use semantic text styles and test at the largest setting. (5) Can a VoiceOver user complete every task? If no: add labels, values and hints to all interactive elements. (6) Are navigation patterns native iOS? If no: replace hamburger menus with tab bars and standard push or modal navigation. These six rows are the scoring basis referenced by the scoring instruction.
<!-- vpmodule:atom:end ios-hig-design-quick-diagnostic -->
<!-- vpmodule:atom:begin ios-hig-design-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-score
title: Score iOS native idiom and accessibility
summary: "Score six diagnostic rows plus up to four native-idiom points, report the score and the improvements needed to reach 10/10, using only the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an iOS interface.
conditions_does_not_apply_when: A code review that does not assess the interface.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, failed rows and improvements."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score iOS native idiom and accessibility

Scoring rule: goal is 10/10. Award 1 point per satisfied row of the Quick Diagnostic (6 rows), plus up to 4 points for native idiom: +1 for semantic colors/text styles throughout with no hardcoded values, +1 for system controls over custom reimplementations, +1 for standard gestures and meaningful haptics, +1 for SF Symbols and correct app-icon shape. Bands: 9-10 = native, accessible, adapts to Dark Mode and Dynamic Type, zero foreign patterns; 5-6 = works but leaks Android idioms or hardcodes color/size; <=3 = fails safe areas, touch targets, or VoiceOver. Always state the score and the specific improvements needed to reach 10/10.
<!-- vpmodule:atom:end ios-hig-design-score -->
<!-- vpmodule:atom:begin ios-hig-design-typography -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ios-hig-design-typography
title: Use semantic type and Dynamic Type
summary: "Use SF Pro semantic text styles rather than hardcoded sizes, keep text at least 11pt with 1.3x line height, left-align it, and test every layout at the largest Dynamic Type size."
capability_tags:
  - design-ios-interface
pattern_tags:
  - dynamic-type
conditions_applies_when: Setting iOS typography.
conditions_does_not_apply_when: A fixed-size logo or decorative mark.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Text styles are semantic and layouts survive the largest Dynamic Type size.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ios-hig-design/SKILL.md; sha256=30bccd96dc11fd875642f0ef3c0971e3c7ceaf3d38643c524bec07a8927b8b17; locator=skills/ios-hig-design/SKILL.md#L53-L79"
status: active
revision: 1
---

# Use semantic type and Dynamic Type

Typography & Dynamic Type: iOS uses San Francisco (SF Pro) with semantic text styles that auto-scale via Dynamic Type. Sizes: Large Title 34pt Bold; Title 17pt Medium; Body 17pt Regular; Caption 12-13pt; secondary text 15pt at 60% opacity. Minimum text size is 11pt and only for captions/secondary text. Line height must be at least 1.3x font size; optimal mobile line length is 35-50 characters. Text is always left-aligned and never justified. Use .font(.title)/.font(.body)/.font(.caption) semantic styles instead of hardcoded sizes; use @ScaledMetric for custom spacing that must scale; prefer weight and color variation over extreme size differences for hierarchy; test all layouts at the largest Dynamic Type size. Context mapping: screen titles use .largeTitle/.title (collapses on scroll), body .body 17pt, secondary .subheadline/.footnote, tab labels 10pt SF text, buttons .body semibold.
<!-- vpmodule:atom:end ios-hig-design-typography -->