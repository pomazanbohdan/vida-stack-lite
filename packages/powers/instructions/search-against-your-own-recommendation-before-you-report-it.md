---
instruction_id: search-against-your-own-recommendation-before-you-report-it
title: Search against your own recommendation before you report it
summary: One full research cycle is spent looking for the criticism of the recommendation; finding none means the search was too narrow.
capability_tags:
  - research-primary-sources
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A recommendation has been formed and is about to be reported.
conditions_does_not_apply_when: The research is a factual lookup of a single technology.
artifact_contract_output_type: disconfirming-pass
artifact_contract_required_data:
  - the search terms used
  - the disconfirming evidence found
  - the caveat it produced
artifact_contract_verified_by: one full cycle against the recommendation was run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-research.md
status: active
revision: 1
---

# Search against your own recommendation before you report it
After forming your initial recommendation, spend one full research cycle searching AGAINST it. Use search terms like "{technology} problems", "{technology} alternatives", "why not {technology}", "{technology} vs {competitor}". For each piece of disconfirming evidence found, either (a) refute it with higher-confidence sources, or (b) add it as a caveat to your recommendation. If you cannot find ANY criticism of your recommendation, your search was too narrow -- widen it
