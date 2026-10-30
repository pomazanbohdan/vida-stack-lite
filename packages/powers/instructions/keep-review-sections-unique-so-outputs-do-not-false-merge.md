---
instruction_id: keep-review-sections-unique-so-outputs-do-not-false-merge
title: Keep review sections unique so outputs do not false-merge
summary: Two lanes that render under the same heading silently merge into an apparent consensus that never happened.
capability_tags:
  - review-code
pattern_tags:
  - collision-free-naming
conditions_applies_when: A new reviewer or producer is registered in a set that is already installed.
conditions_does_not_apply_when: The set has one member.
artifact_contract_output_type: output-slot-uniqueness
artifact_contract_required_data:
  - the heading or slug
  - the set it must be unique in
artifact_contract_verified_by: the heading or slug is unique across the installed set and the collision is checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep review sections unique so outputs do not false-merge
`reviewsSection` is the heading your findings render under in `REVIEWS.md`. It must be unique across every installed lane; two lanes sharing a heading would silently merge their output into apparent consensus that never happened.
The install command reports success, and your lane simply never appears.
