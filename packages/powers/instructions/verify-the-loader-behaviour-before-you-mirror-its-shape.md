---
instruction_id: verify-the-loader-behaviour-before-you-mirror-its-shape
title: Verify the loader behaviour before you mirror its shape
summary: "The shape that is given to a target follows the loader behaviour that was verified for it; where the loader behaviour is not verified, the conservative shape is kept."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: The layout that is produced for a target is being chosen.
conditions_does_not_apply_when: The loader behaviour of the target is documented and confirmed.
artifact_contract_output_type: loader-verified-layout
artifact_contract_required_data:
  - the loader behaviour that was verified
  - the shape that follows from it
  - what is kept when it is unverified
artifact_contract_verified_by: the shape follows the verified loader behaviour and stays conservative when it is unverified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/skill-mapping-matrix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Verify the loader behaviour before you mirror its shape
- The nesting flag is set per the verified loader behavior of each runtime.
- Loader depth not independently verified; kept flat to avoid mis-nesting
