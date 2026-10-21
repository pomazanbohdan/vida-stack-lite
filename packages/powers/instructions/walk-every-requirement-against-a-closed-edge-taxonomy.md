---
instruction_id: walk-every-requirement-against-a-closed-edge-taxonomy
title: Walk every requirement against a closed edge taxonomy
summary: "Every requirement is walked against a small fixed set of edge categories, and only the categories that apply to it are raised."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: Requirements are written and their edge cases are checked.
conditions_does_not_apply_when: The work is not a specification of behavior.
artifact_contract_output_type: edge-taxonomy-walk
artifact_contract_required_data:
  - the requirement
  - the categories that apply to it
  - the candidate edge per category
artifact_contract_verified_by: every requirement was walked and only the applicable categories were raised
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/edge-probe.md
status: active
revision: 1
---

# Walk every requirement against a closed edge taxonomy
Closed and small by design: a fixed eight the author must explicitly clear beats thirty nobody finishes.
Walk each requirement against the closed taxonomy below, propose a concrete candidate edge for each applicable category, and resolve each to exactly one state.
Relevance filter first. Classify each requirement's shape, then raise only the categories whose `applies to shapes` intersect that requirement's shapes.
A pure-text requirement is never asked about overflow.
Adopt the established QA names verbatim — this is decades-old black-box test technique, moved upstream to the spec layer.
