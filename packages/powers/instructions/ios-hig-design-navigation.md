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
