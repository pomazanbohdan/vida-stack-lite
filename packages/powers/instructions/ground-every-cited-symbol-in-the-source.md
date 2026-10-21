---
instruction_id: ground-every-cited-symbol-in-the-source
title: Ground every cited symbol in the source
summary: "Every symbol the work cites is resolved against the source, and the symbols that could not be checked are listed."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A plan cites symbols that have to be checked.
conditions_does_not_apply_when: Nothing is cited.
artifact_contract_output_type: symbol-grounding
artifact_contract_required_data:
  - the cited symbols
  - the verdict for each
  - the symbols that could not be checked
artifact_contract_verified_by: every cited symbol carries a verdict and the unchecked ones are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Ground every cited symbol in the source
List every referenced symbol by kind, quoting the plan line for each (coverage must be auditable)
Resolve each remaining symbol using the effective authority adapter
Never treat UNCHECKABLE as verified or missing.
listing every UNCHECKABLE/skipped symbol and why — a clean review must never silently mean "nothing was checked."
stops the review cycle immediately; do not proceed until the plan author resolves the missing symbol.
plan proceeds only if the author confirms the symbol is genuinely new or dynamically resolved, and that acknowledgement is recorded.
