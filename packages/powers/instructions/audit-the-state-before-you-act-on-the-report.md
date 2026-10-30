---
instruction_id: audit-the-state-before-you-act-on-the-report
title: Audit the state before you act on the report
summary: The state is checked against the artefacts before the report is acted on; every check emits a pass or a warning with concrete evidence.
capability_tags:
  - audit-codebase
  - verify-work-results
pattern_tags:
  - dimension-sweep
  - evidence-analysis
conditions_applies_when: A report about the state of the work is about to be used to decide what happens next.
conditions_does_not_apply_when: The report was produced by the check itself in this run.
artifact_contract_output_type: integrity-audit
artifact_contract_required_data:
  - each check and its verdict
  - the concrete evidence behind every warning
  - the next action for every failed check
artifact_contract_verified_by: every check emitted a verdict with evidence and every failed check names a next action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Audit the state before you act on the report
Run each check in order. For each check, emit ✓ (pass) or ⚠ (warning) with concrete evidence when a problem is found.

The standard progress report may not reflect true project state. Review the flagged items above before acting on the routing suggestion.

