---
instruction_id: state-the-severity-of-the-defect
title: State the severity of the defect
summary: "A defect carries one of three severity levels, each with its own meaning."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A defect is written up as a work item.
conditions_does_not_apply_when: The item describes a change rather than a defect.
artifact_contract_output_type: severity-statement
artifact_contract_required_data:
  - the severity level
  - what the level means
artifact_contract_verified_by: "the severity names one of the levels and the level's meaning"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/bug-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
---

# State the severity of the defect
critical: outage, data loss, or security exposure
important: core function broken, no workaround
minor: impaired, a workaround exists, or cosmetic
- Critical | 9.0 – 10.0 | Acknowledge within 24 h; fix ASAP
- Important | 7.0 – 8.9 | Acknowledge within 48 h; fix ≤1 wk
- Important | 4.0 – 6.9 | Acknowledge within 1 wk; next minor
- Minor | 0.1 – 3.9 | Acknowledge within 2 wk; next minor
