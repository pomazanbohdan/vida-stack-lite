---
instruction_id: classify-each-commit-by-what-it-touches
title: Classify each commit by what it touches
summary: "Every commit is classified by the files it touches, and each classification arm is a condition that can be computed, so the decision is never a reading of the situation."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
  - exhaustive-path-enumeration
conditions_applies_when: A set of commits is filtered before it is republished.
conditions_does_not_apply_when: The commits are published as they are.
artifact_contract_output_type: commit-classification
artifact_contract_required_data:
  - the counts of the files each commit touches
  - the class of each commit
artifact_contract_verified_by: every commit carries a class and every class was decided by a computable condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pr-branch.md
status: active
revision: 1
---

# Classify each commit by what it touches
Classify, using `NON_PLANNING`, `STRUCTURAL`, and `PLANNING_COUNT` computed above — every arm's condition is explicit and computable so no reading of it is ambiguous:

- **Code commits**: `NON_PLANNING > 0` and `PLANNING_COUNT == 0` → INCLUDE (both modes)
- **Mixed code+planning commits**: `NON_PLANNING > 0` and `PLANNING_COUNT > 0` → INCLUDE (both modes; the planning paths are filtered out by `create_pr_branch`, not the commit)
- **Structural-only planning commits**: `NON_PLANNING == 0` and `STRUCTURAL == PLANNING_COUNT` and `PLANNING_COUNT > 0` (every `.planning/` file touched is structural) → INCLUDE in **default** mode; **EXCLUDE** in strict mode, which has no structural carve-out
- **Transient-only planning commits**: `NON_PLANNING == 0` and `STRUCTURAL == 0` and `PLANNING_COUNT > 0` → EXCLUDE (both modes)
