---
instruction_id: give-a-conditional-recommendation-not-a-single-winner
title: "Give a conditional recommendation, not a single winner"
summary: Each option carries the condition under which it is the right one; no option is declared the universal winner.
capability_tags:
  - assess-change-impact
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Several viable options are presented and a recommendation is written for each of them.
conditions_does_not_apply_when: Exactly one option is viable and the others are rejected on evidence.
artifact_contract_output_type: option-comparison
artifact_contract_required_data:
  - the options
  - the condition attached to each option
artifact_contract_verified_by: every recommendation names the condition under which it applies
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-advisor-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-advisor-researcher.compact.md
status: active
revision: 1
---

# Give a conditional recommendation, not a single winner
Recommendation = conditional ("Rec if mobile-first", "Rec if SEO matters"). Not single-winner ranking.
Do NOT rank options or declare a single winner (use conditional recommendations)
