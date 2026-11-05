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
