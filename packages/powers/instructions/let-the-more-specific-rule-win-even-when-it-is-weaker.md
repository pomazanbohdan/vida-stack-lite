---
instruction_id: let-the-more-specific-rule-win-even-when-it-is-weaker
title: Let the more specific rule win even when it is weaker
summary: A matched rule replaces the global default even when it lowers the depth; otherwise a weaker rule could never take effect.
capability_tags:
  - review-code
pattern_tags:
  - override-layering
conditions_applies_when: A rule and the global default both apply to the files under review.
conditions_does_not_apply_when: No rule matches the files under review.
artifact_contract_output_type: rule-resolution
artifact_contract_required_data:
  - the global default
  - the matched rule
  - the resolved depth
artifact_contract_verified_by: the matched rule decided the depth and the output names it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 1
---

# Let the more specific rule win even when it is weaker
**Rules win over the global default, even when weaker.** If `workflow.code_review_depth` is `deep` but a matched rule says `quick`, the review runs at `quick` — the rule always replaces the global for files it matches.
This is deliberate: if the strongest tier always won, a `quick` or `standard` rule could never actually take effect whenever the project default was `deep`, making it silently inert.
