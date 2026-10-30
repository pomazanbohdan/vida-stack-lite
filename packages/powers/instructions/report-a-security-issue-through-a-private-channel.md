---
instruction_id: report-a-security-issue-through-a-private-channel
title: Report a security issue through a private channel
summary: "A vulnerability is reported through the private channel and never through a public issue, so the detail does not travel to everyone before it is fixed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A vulnerability has been found and is about to be reported.
conditions_does_not_apply_when: There is no vulnerability to report.
artifact_contract_output_type: private-reporting
artifact_contract_required_data:
  - the private channel
  - what the report contains
  - what is not used
artifact_contract_verified_by: the report went through the private channel and no public issue was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report a security issue through a private channel
- Report security vulnerabilities via **private security advisory** on GitHub:
- Do not open public issues for security vulnerabilities.
