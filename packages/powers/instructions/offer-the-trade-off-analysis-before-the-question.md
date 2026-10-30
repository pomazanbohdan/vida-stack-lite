---
instruction_id: offer-the-trade-off-analysis-before-the-question
title: Offer the trade-off analysis before the question
summary: "The alternatives, their trade-offs and a recommendation are laid out before the question is asked."
capability_tags:
  - clarify-requirements
pattern_tags:
  - concise-communication
conditions_applies_when: A decision is about to be put to the user and the alternatives are not yet laid out.
conditions_does_not_apply_when: The decision is already made and only the record is being written.
artifact_contract_output_type: trade-off-brief
artifact_contract_required_data:
  - the options with their trade-offs
  - the recommendation
  - the pitfalls from earlier work
artifact_contract_verified_by: the recommendation names the project context it follows from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/analyze.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Offer the trade-off analysis before the question
Before presenting each question (or question group, in batch mode), provide a brief **trade-off analysis** for the decision:
2-3 options with pros/cons based on codebase context and common patterns
A recommended approach with reasoning
Known pitfalls or constraints from prior phases
Pros/cons should reflect the codebase context loaded in `scout_codebase` and any prior decisions surfaced in `load_prior_context`.
The recommendation must explicitly tie to project context (e.g., existing libraries, prior phase decisions, documented requirements).
If a related ADR or spec is referenced in
the canonical refs,
cite it in the recommendation.
