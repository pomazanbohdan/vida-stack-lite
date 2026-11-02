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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Score each submission against the required fields
For each classified issue, review against its template requirements.
Count required fields present vs. total required fields
Score = (present / total) * 100
Report the missing required fields.
