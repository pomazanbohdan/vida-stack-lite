---
instruction_id: keep-the-core-sections-of-a-generated-report-frozen
title: Keep the core sections of a generated report frozen
summary: "Extra sections are appended after the required ones; they never replace, remove or reorder the core sections of the report."
capability_tags:
  - define-output-format
pattern_tags:
  - override-layering
conditions_applies_when: A report is assembled from a fixed set of required sections plus optional extra ones.
conditions_does_not_apply_when: The report has no fixed core and every section is optional.
artifact_contract_output_type: report-body
artifact_contract_required_data:
  - the required core sections
  - the extra sections
  - the order they are rendered in
artifact_contract_verified_by: "the core sections are present, in order, and the extras come after them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the core sections of a generated report frozen
Treat configured sections as append-only.
They are rendered after `Key Decisions` and cannot replace, remove, or reorder the required core sections: `Summary`, `Changes`, `Requirements Addressed`, `Verification`, and `Key Decisions`.
Omit sections whose final rendered body is empty after trimming.
