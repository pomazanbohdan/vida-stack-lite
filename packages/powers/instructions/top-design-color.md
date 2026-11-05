---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-color
title: Invent the palette
summary: "Build color for the project with one of three approaches, avoid pure #000 and #fff, define a functional opacity hierarchy, use one restrained accent and support light and dark contexts."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - invented-palette
conditions_applies_when: Choosing the color system for a high-craft experience.
conditions_does_not_apply_when: A brand palette that is fixed by an external identity system.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The palette names its approach and avoids pure black or white.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L138-L154"
status: active
revision: 1
---

# Invent the palette

Color should feel invented for each project, never pulled from a generic palette generator. Three approaches are allowed: monochromatic tension (95% one color, 5% accent), bold signature (own a combination), or contextual shifting (the palette responds to content). Never use pure black or pure white: #0a0a0a and #fafaf9 have the required physical quality that #000/#fff lack. Build a functional hierarchy with text-primary, text-secondary at 60% opacity, text-tertiary at 40%, surface, and border at 10% for consistent depth. Use one strong accent sparingly (#ff4d00 or similar) rather than a complex multi-color palette. Contextual color shifts between sections create visual chapters. Design the system for both light and dark contexts, not individual instances. Drive everything from CSS custom properties (--color-dark/-light/-accent plus functional --color-text-primary/-surface), and restrict the accent to CTAs, links, and single-detail moments.
