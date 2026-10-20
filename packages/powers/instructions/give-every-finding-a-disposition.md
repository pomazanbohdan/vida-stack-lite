---
instruction_id: give-every-finding-a-disposition
title: Give every finding a disposition
summary: "Every finding in the log carries one of four dispositions, and a changed disposition is appended, never rewritten."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A finding is written into the review log.
conditions_does_not_apply_when: The log entry carries no finding.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the finding
  - its disposition
artifact_contract_verified_by: "each finding names one of fixed, accepted as-is, deferred, or open"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 1
---

# Give every finding a disposition
In Result, give each finding's disposition: fixed, accepted as-is, deferred, or open. When a disposition changes, append a new entry; do not edit earlier ones.
