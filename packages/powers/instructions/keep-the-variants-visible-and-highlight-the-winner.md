---
instruction_id: keep-the-variants-visible-and-highlight-the-winner
title: Keep the variants visible and highlight the winner
summary: Two or three variants are produced side by side; the winner is marked and the rest stay navigable.
capability_tags:
  - design-user-interface
pattern_tags:
  - experiment-design
conditions_applies_when: Several design directions are being shown for a decision.
conditions_does_not_apply_when: Only one direction is being shown.
artifact_contract_output_type: variant-set
artifact_contract_required_data:
  - the variants
  - the marked winner
artifact_contract_verified_by: the winner is marked and every variant is still reachable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/sketch-variant-patterns.md
status: active
revision: 1
---

# Keep the variants visible and highlight the winner
Every sketch produces 2-3 variants in the same HTML file. The user switches between them to compare
Never more than 4 — more than that overwhelms. If there are 5+ options, narrow before showing
Keep all variants visible and navigable — the winner is highlighted, not the only option
First round (dramatic): 2-3 meaningfully different approaches
Refinement rounds: 2-3 subtle variations within the chosen direction
