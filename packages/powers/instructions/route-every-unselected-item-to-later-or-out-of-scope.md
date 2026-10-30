---
instruction_id: route-every-unselected-item-to-later-or-out-of-scope
title: Route every unselected item to later or out of scope
summary: "Nothing that was offered is dropped: the selected items belong to this milestone, the unselected table stakes belong to the next one, and the unselected differentiators become explicit exclusions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: A category of items is scoped for the current milestone.
conditions_does_not_apply_when: Every item in the category is selected.
artifact_contract_output_type: scope-routing-record
artifact_contract_required_data:
  - the selected items
  - the items routed to the next milestone
  - the items excluded
artifact_contract_verified_by: no offered item is dropped without a destination
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Route every unselected item to later or out of scope
Selected features → v1 requirements
Unselected table stakes → v2 (users expect these)
Unselected differentiators → out of scope
Selected → this milestone.
Unselected table stakes → future.
Nothing is dropped silently.
