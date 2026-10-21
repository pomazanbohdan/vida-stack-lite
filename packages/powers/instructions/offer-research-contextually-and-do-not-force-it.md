---
instruction_id: offer-research-contextually-and-do-not-force-it
title: Offer research contextually and do not force it
summary: "Research is offered when the conversation has surfaced a question it could answer, and skipped when it does not — it is never forced."
capability_tags:
  - research-primary-sources
pattern_tags:
  - staged-elicitation
conditions_applies_when: The conversation may have surfaced a question a research pass could answer.
conditions_does_not_apply_when: The topic plainly does not warrant research.
artifact_contract_output_type: research-offer
artifact_contract_required_data:
  - the question that was surfaced
  - the offer
  - the answer to the offer
artifact_contract_verified_by: the research pass ran only after it was asked for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 1
---

# Offer research contextually and do not force it
If the conversation surfaces factual questions, technology comparisons, or unknowns that research could resolve, offer:
If the topic doesn't warrant research, skip this step entirely. **Don't force it.**
