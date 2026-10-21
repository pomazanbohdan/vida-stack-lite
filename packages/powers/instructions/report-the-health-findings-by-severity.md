---
instruction_id: report-the-health-findings-by-severity
title: Report the health findings by severity
summary: "The health report states one status and groups the findings into Critical, Important and Minor, with the count per group."
capability_tags:
  - define-output-format
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A health check produced findings about the state of the workspace.
conditions_does_not_apply_when: The check produced nothing.
artifact_contract_output_type: health-report
artifact_contract_required_data:
  - the status
  - the findings per severity
  - the count per severity
artifact_contract_verified_by: the report states the status and the findings grouped by severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/health.md
status: active
revision: 1
---

# Report the health findings by severity
Status: HEALTHY | DEGRADED | BROKEN
Critical: N | Important: N | Minor: N
N issues can be auto-repaired.
