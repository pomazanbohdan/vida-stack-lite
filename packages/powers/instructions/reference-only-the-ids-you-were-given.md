---
instruction_id: reference-only-the-ids-you-were-given
title: Reference only the ids you were given
summary: A dependency references an id from the catalogue that was handed over; an invented or self-referential id is rejected and blocks the whole batch.
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: An item declares what it depends on.
conditions_does_not_apply_when: The item has no dependencies at all.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the referenced ids
  - the catalogue they came from
artifact_contract_verified_by: every referenced id exists in the catalogue and none is the item itself
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-quick-batch.md
status: active
revision: 1
---

# Reference only the ids you were given
Reference ONLY `quick_id`s from the task catalog you were given. Never reference a plan id from a phase, another batch, or a value you invented
Empty array (`depends_on: []`) is the correct, common answer when your item is genuinely independent — do not manufacture a dependency to seem thorough
A dependency on your OWN `quick_id` (self-reference) or on an id outside the catalog is rejected by `quick-batch update` and blocks the whole layer's persistence — when uncertain, prefer `[]` over a guess
