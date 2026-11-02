---
instruction_id: restore-the-base-state-for-every-filtered-path
title: Restore the base state for every filtered path
summary: "A path that was filtered out is put back to exactly what the branch already had, in the index and in the working tree."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A path was filtered out of a commit that is being replayed.
conditions_does_not_apply_when: No path was filtered out.
artifact_contract_output_type: filtered-path-state
artifact_contract_required_data:
  - the restored state of each filtered path
  - the index and the working tree
artifact_contract_verified_by: no filtered path is left behind and none was turned into a deletion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Restore the base state for every filtered path
The filter forces every filtered path back to exactly what the PR branch's HEAD already has, in both the index and the working tree.
Without this, un-staging a path the target branch already tracks records a DELETION
and every remaining commit is silently dropped.
