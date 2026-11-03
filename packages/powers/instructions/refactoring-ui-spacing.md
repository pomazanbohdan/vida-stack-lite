---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-spacing
title: Use a constrained spacing scale
summary: "Use 4, 8, 16, 24, 32, 48 and 64 px, start with generous whitespace, group related elements, and constrain text and form widths."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Setting spacing, margins or content widths."
conditions_does_not_apply_when: A platform-fixed layout with no spacing decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Spacing follows the scale, groups are visibly related, and text and forms use readable widths."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L55-L79"
status: active
revision: 1
---

# Use a constrained spacing scale

Use the constrained spacing scale 4, 8, 16, 24, 32, 48, 64 px. Start with too much whitespace and remove it; make gaps between groups larger than within groups; constrain text to 45-75 characters and forms to 300-500 px.
