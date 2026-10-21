---
instruction_id: score-each-submission-against-the-required-fields
title: Score each submission against the required fields
summary: Every submission is checked against the fields its template requires and is reported with a completeness score and the list of the missing fields.
capability_tags:
  - triage-reports
pattern_tags:
  - output-formatting
conditions_applies_when: Incoming submissions are checked against a template.
conditions_does_not_apply_when: There are no submissions to check.
artifact_contract_output_type: completeness-report
artifact_contract_required_data:
  - the score of each submission
  - the missing required fields
artifact_contract_verified_by: every submission carries its score and its missing fields
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/inbox.md
status: active
revision: 1
---

# Score each submission against the required fields
For each classified issue, review against its template requirements.
Count required fields present vs. total required fields
Score = (present / total) * 100
Report the missing required fields.
