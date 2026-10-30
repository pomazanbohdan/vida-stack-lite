---
instruction_id: cross-check-the-record-against-the-artifacts
title: Cross-check the record against the artifacts
summary: "The recorded state is compared with the artifacts on disk, and a contradiction between them is reported."
capability_tags:
  - triage-reports
pattern_tags:
  - evidence-analysis
conditions_applies_when: A record states that work is pending.
conditions_does_not_apply_when: The record was written by the run that produced the artifacts.
artifact_contract_output_type: state-consistency-check
artifact_contract_required_data:
  - the recorded state
  - the artifact count
  - the inconsistency when there is one
artifact_contract_verified_by: the record and the artifacts were compared and a contradiction was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Cross-check the record against the artifacts
Compare against the artifact count from the roadmap analysis.
but the artifact count shows it as complete
flag inconsistency.
