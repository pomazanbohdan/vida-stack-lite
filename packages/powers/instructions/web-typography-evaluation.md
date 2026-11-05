---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-evaluation
title: Evaluate a typeface before committing
summary: "Gate every candidate on technical quality, structure, practical fit and real-content testing, and verify the web license before shipping."
capability_tags:
  - set-web-type
pattern_tags:
  - typeface-evaluation
conditions_applies_when: Vetting a typeface for a project.
conditions_does_not_apply_when: Reusing an already approved brand face.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The evaluation records technical, structural, practical and licensing checks."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L66-L97"
status: active
revision: 1
---

# Evaluate a typeface before committing

A candidate typeface must pass technical, structural, and practical quality checks before it earns a place in a project because beautiful specimens can fail on screen. Technical quality requires consistent stroke weights, even visual color across text blocks, good kerning pairs such as AV, To, and Ty, a complete character set, and multiple weights with at least regular, bold, and italic. Structural assessment favors a generous x-height for screen readability, open counters and apertures (a, e, c), and distinct letterforms (Il1, O0, rn vs. m). Practical needs require testing at actual use sizes on target screens, checking file size, and verifying the license; do not rely on Lorem ipsum because it hides problems with character frequency, word length, and paragraph rhythm, so test with real representative content. Match checks to use: body text prioritizes x-height, open counters, and even color; UI/system text prioritizes small-size legibility and weight range; multilingual products must verify glyph coverage for target languages. Always verify the web license before shipping a font because desktop/print licenses rarely cover web embedding and unlicensed use creates legal liability.
