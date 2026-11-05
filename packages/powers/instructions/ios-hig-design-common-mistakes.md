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
