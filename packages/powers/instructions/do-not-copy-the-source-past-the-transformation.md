---
instruction_id: do-not-copy-the-source-past-the-transformation
title: Do not copy the source past the transformation
summary: Copying the shipped source files by hand bypasses the transformation the packaging performs and produces schema errors or missing commands.
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - source-conversion
conditions_applies_when: The artefacts of a package are put in place by hand instead of by its installer.
conditions_does_not_apply_when: "The package's own installer performs the transformation."
artifact_contract_output_type: installation-record
artifact_contract_required_data:
  - the source that was copied
  - the transformation that was skipped
artifact_contract_verified_by: "the transformation was run, so no schema error and no missing command appears"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/install-on-your-runtime.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not copy the source past the transformation
Doing so bypasses the transformations and produces schema-validation errors or missing commands.
