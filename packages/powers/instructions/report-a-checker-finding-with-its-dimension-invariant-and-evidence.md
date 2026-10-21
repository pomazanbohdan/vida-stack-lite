---
instruction_id: report-a-checker-finding-with-its-dimension-invariant-and-evidence
title: "Report a checker finding with its dimension, invariant and evidence"
summary: "A checker finding names the dimension it belongs to, the invariant that must hold, the evidence that it does not, the metrics and one route to the fix."
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A checker produced a finding about a plan.
conditions_does_not_apply_when: The result is a free-text report rather than a structured finding.
artifact_contract_output_type: checker-finding
artifact_contract_required_data:
  - the dimension
  - the required property
  - the description
  - the metrics
  - the fix hint
artifact_contract_verified_by: "the finding names the dimension, the property and the evidence"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/plan-checker-examples.md
status: active
revision: 1
---

# Report a checker finding with its dimension, invariant and evidence
dimension: scope_sanity
severity: Critical
required_property: "Each plan stays within the per-plan context budget"
description: "Plan 01 has 5 tasks with 12 files - exceeds context budget"
metrics:
  tasks: 5
  files: 12
fix_hint: "Split into: 01 (schema + API), 02 (middleware + lib), 03 (UI components)"
5 tasks exceeds 2-3 target, 12 files is high, auth is complex domain → quality degradation risk
