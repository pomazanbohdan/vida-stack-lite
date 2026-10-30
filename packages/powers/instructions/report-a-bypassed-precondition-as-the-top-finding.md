---
instruction_id: report-a-bypassed-precondition-as-the-top-finding
title: Report a bypassed precondition as the top finding
summary: "An artefact that skipped the precondition it needed is cross-referenced and reported as the most important finding, not as a note among others."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The artefacts under review have preconditions that can be checked.
conditions_does_not_apply_when: Nothing under review has a precondition.
artifact_contract_output_type: precondition-report
artifact_contract_required_data:
  - the artefacts that skipped a precondition
  - the precondition each one needed
artifact_contract_verified_by: the bypassed precondition is the first thing reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report a bypassed precondition as the top finding
Cross-reference issues and PRs to enforce the issue-first rule:
Report gate violations prominently - these are the most important findings
A missing approval is a violation.
