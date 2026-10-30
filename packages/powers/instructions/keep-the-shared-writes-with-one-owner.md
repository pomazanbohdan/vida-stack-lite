---
instruction_id: keep-the-shared-writes-with-one-owner
title: Keep the shared writes with one owner
summary: One coordinator owns every shared write; the workers return results and never write the shared state themselves.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - program-orchestration
conditions_applies_when: Several workers run in a batch that has shared state.
conditions_does_not_apply_when: A single worker owns the whole batch.
artifact_contract_output_type: batch-ownership
artifact_contract_required_data:
  - the owner of the shared writes
  - the workers that only return results
artifact_contract_verified_by: every shared write has one owner and no worker wrote the shared state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the shared writes with one owner
owns every shared write
and never delegates them to a leaf.
return structured results only
themselves (single-writer invariant).
