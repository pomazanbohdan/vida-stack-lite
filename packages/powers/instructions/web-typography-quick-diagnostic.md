---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-quick-diagnostic
title: Run the 10-row type diagnostic
summary: "Check body size, measure, line height, level contrast, real-device testing, 200KB payload, fallbacks, 200% zoom, headline orphans and link distinction, with a score and action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of web typography.
conditions_does_not_apply_when: A full typeface selection exercise.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all 10 rows and states the score with an action for every no.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L276-L290"
status: active
revision: 1
---

# Run the 10-row type diagnostic

Use this ten-row diagnostic and act on every No: body text must be 16px or larger, prefer 18px for reading-heavy pages, otherwise increase to at least 16px; line length must be under 75 characters, otherwise set max-width 65ch on prose containers; body line height must be 1.4+, otherwise increase to 1.5-1.7; type levels must have clear contrast, otherwise increase size or weight differences; every actual use size must be tested on real screens/target devices; total font payload must be under 200KB, otherwise subset, use WOFF2, and consider variable fonts; fallback fonts must be specified in every font-family, otherwise add system fallbacks to prevent FOIT/blank text; the page must work at 200% zoom, otherwise fix overflow and truncation; headings must be free of orphaned words, otherwise use text-wrap: balance or manual breaks; links must be visually distinct, otherwise use color and/or underline distinction.
