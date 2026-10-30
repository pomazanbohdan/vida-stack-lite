---
instruction_id: report-every-invalid-path-with-its-consequence
title: Report every invalid path with its consequence
summary: A failing update reports every invalid path and says what happens to that runtime configuration next.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An update fails on an invalid path.
conditions_does_not_apply_when: The update succeeded.
artifact_contract_output_type: invalid-path-report
artifact_contract_required_data:
  - the invalid paths
  - what happens to the configuration for each
artifact_contract_verified_by: every invalid path is reported with the consequence for the configuration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/update-gsd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report every invalid path with its consequence
the update fails and reports every invalid path, each tagged with what happens to that runtime's config next
