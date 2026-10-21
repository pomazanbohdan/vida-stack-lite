---
instruction_id: specify-the-reference-dataset-size-coverage-and-labelling
title: "Specify the reference dataset: size, coverage and labelling"
summary: "A reference dataset is specified with its size, the scenario types it covers and who labels it."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: An evaluation strategy is written.
conditions_does_not_apply_when: The evaluation has no reference dataset.
artifact_contract_output_type: reference-dataset-spec
artifact_contract_required_data:
  - the size of the dataset
  - the scenario types it covers
  - who labels the examples and how
artifact_contract_verified_by: "the size, the composition and the labelling are all defined"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 1
---

# Specify the reference dataset: size, coverage and labelling
**Size:** <!-- e.g., 20 examples to start -->
<!-- What scenario types the dataset covers: critical paths, edge cases, failure modes -->
<!-- Who labels examples and how (domain expert, LLM judge with calibration, etc.) -->
[ ] Reference dataset spec written (size ≥ 10, composition + labeling defined)
