---
instruction_id: flag-what-you-cannot-classify-for-manual-triage
title: Flag what you cannot classify for manual triage
summary: "An item that cannot be classified is flagged for a human instead of being guessed at, and the count of the unclassified is reported."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Incoming items are classified by type.
conditions_does_not_apply_when: Every item carries an unambiguous type.
artifact_contract_output_type: triage-flags
artifact_contract_required_data:
  - the items flagged for a human
  - the count of the unclassified
artifact_contract_verified_by: nothing unclassifiable is silently classified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/inbox.md
status: active
revision: 1
---

# Flag what you cannot classify for manual triage
No matching label | Unknown | Flag for manual triage
Cannot determine: flag it.
Report the unclassified count.
Unclassifiable is not dropped.
