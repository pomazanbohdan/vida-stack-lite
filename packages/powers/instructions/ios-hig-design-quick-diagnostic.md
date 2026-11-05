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
