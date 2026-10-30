---
instruction_id: give-every-parallel-unit-exclusive-file-ownership
title: Give every parallel unit exclusive file ownership
summary: Two units may run in parallel only when their file lists do not overlap; an overlapping file makes the later unit depend on the earlier one.
capability_tags:
  - plan-implementation
pattern_tags:
  - parallel-execution
conditions_applies_when: Units are grouped into a wave that will run in parallel.
conditions_does_not_apply_when: The units are ordered by an explicit dependency.
artifact_contract_output_type: file-ownership
artifact_contract_required_data:
  - the files each unit touches
  - the overlap
  - the dependency it creates
artifact_contract_verified_by: no two units in the same wave claim the same file without a dependency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Give every parallel unit exclusive file ownership
Exclusive file ownership prevents conflicts
No overlap → can run parallel. File in multiple plans → later plan depends on earlier
