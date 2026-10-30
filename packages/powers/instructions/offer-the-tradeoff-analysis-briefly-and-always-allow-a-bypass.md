---
instruction_id: offer-the-tradeoff-analysis-briefly-and-always-allow-a-bypass
title: Offer the tradeoff analysis briefly and always allow a bypass
summary: "A tradeoff analysis is short, aligned with the stated goals, and can always be declined."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - multi-voice-delivery
conditions_applies_when: The user shows competing priorities and has not yet chosen.
conditions_does_not_apply_when: The user has already made a clear choice.
artifact_contract_output_type: tradeoff-analysis
artifact_contract_required_data:
  - what each option optimizes for
  - what it sacrifices
  - the recommendation
  - the bypass
artifact_contract_verified_by: the analysis is at most five bullets and the bypass is offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-partner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer the tradeoff analysis briefly and always allow a bypass
Developer has already made a clear choice
The "or" is rhetorical or trivial (e.g., "tabs or spaces" — use project convention)
Simple yes/no questions
Developer explicitly asks to move on
provide a brief (3-5 bullet) analysis covering
What each approach optimizes for
What each approach sacrifices
Which aligns better with the project's stated goals
A recommendation with reasoning
**Skippable** — always offer "No, I've decided" to bypass
**Brief** — 3-5 bullets max, not a full research report
