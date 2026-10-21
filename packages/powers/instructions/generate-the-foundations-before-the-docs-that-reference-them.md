---
instruction_id: generate-the-foundations-before-the-docs-that-reference-them
title: Generate the foundations before the docs that reference them
summary: The documents that cite others are written after the ones they cite.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Documents are written in rounds and the later ones cite the earlier ones.
conditions_does_not_apply_when: No document cites another.
artifact_contract_output_type: document-set
artifact_contract_required_data:
  - the first round
  - the second round
  - the outputs of the first round
artifact_contract_verified_by: the first round was finished before the second round started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 1
---

# Generate the foundations before the docs that reference them
These are foundational docs with no cross-references needed, making them ideal for parallel generation.
Wave 2 agents can reference Wave 1 outputs for cross-referencing
complete all three before starting Wave 2
