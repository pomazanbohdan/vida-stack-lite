---
instruction_id: reference-only-the-identifiers-you-were-given
title: Reference only the identifiers you were given
summary: A dependency names an identifier from the catalog that was handed over; an empty list is a legitimate answer and an invented identifier breaks the whole layer.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan states which other items it depends on.
conditions_does_not_apply_when: The plan has no dependencies.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the referenced identifiers
  - the catalog they came from
artifact_contract_verified_by: every referenced identifier exists in the given catalog and no dependency was manufactured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference only the identifiers you were given
**depends_on - reference SIBLING items by `quick_id`, never invent one**
- Reference ONLY `quick_id`s from the task catalog you were given. Never reference a plan id from a phase, another batch, or a value you invented.
- Empty array (`depends_on: []`) is the correct, common answer when your item is genuinely independent - do not manufacture a dependency to seem thorough.
- A dependency on your OWN `quick_id` (self-reference) or on an id outside the catalog is rejected by the batch update and blocks the whole layer's persistence - when uncertain, prefer `[]` over a guess.
