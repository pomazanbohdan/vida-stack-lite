---
instruction_id: match-the-check-to-the-stack
title: Match the check to the stack
summary: "Identify the framework and the rendering model before applying framework-specific checks, and file every finding under the area it belongs to."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A check or a recommendation depends on the framework in use.
conditions_does_not_apply_when: The framework and the rendering model are already known and recorded.
artifact_contract_output_type: stack-matched-review
artifact_contract_required_data:
  - framework and rendering model
  - checks applied
  - area of each finding
artifact_contract_verified_by: no recommendation names an idiom from a stack the project does not use
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/web-performance-auditor.md
status: active
revision: 1
---

# Match the check to the stack
Identify the framework and rendering model (React, Vue, Svelte, Angular, Next.js, Astro, vanilla HTML, etc.) before applying framework-specific checks. Do not recommend `<Image>` from `next/image` to a Vue app, or `React.memo` to a Svelte app.

Fold AI-generated anti-patterns into their relevant area (Network or Rendering/JS); do not create a separate "AI" category.
