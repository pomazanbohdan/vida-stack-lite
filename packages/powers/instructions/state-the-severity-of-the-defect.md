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
status: active
revision: 1
---

# State the severity of the defect
critical: outage, data loss, or security exposure
important: core function broken, no workaround
minor: impaired, a workaround exists, or cosmetic
