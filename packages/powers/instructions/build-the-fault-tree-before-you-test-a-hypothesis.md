---
instruction_id: build-the-fault-tree-before-you-test-a-hypothesis
title: Build the fault tree before you test a hypothesis
summary: "The possible causes are mapped as a tree before any hypothesis is tested, and unlikely branches are not pruned when they are cheap to test."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Several causes could explain the observed symptom.
conditions_does_not_apply_when: "The error message names the exact file, line and cause."
artifact_contract_output_type: fault-tree
artifact_contract_required_data:
  - the root node
  - the branches
  - the order they are tested in
artifact_contract_verified_by: the tree exists before the first hypothesis is tested
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Build the fault tree before you test a hypothesis
Before testing any hypothesis, build a fault tree: start with the observed symptom as the root node, then branch into all possible causes at each level (hardware, software, configuration, data, environment). Use AND/OR gates -- some failures require multiple conditions (AND), others have independent triggers (OR). This tree becomes your investigation roadmap. Prioritize branches by likelihood and testability, but do NOT prune branches just because they seem unlikely -- unlikely causes that are easy to test should be tested early.
