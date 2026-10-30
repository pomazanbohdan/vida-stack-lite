---
instruction_id: classify-every-review-finding-before-it-leaves-the-review
title: Classify every review finding before it leaves the review
summary: "Every finding carries one of the three severities with the criteria of that level attached, and an unclassified finding is not valid output."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A review reports defects.
conditions_does_not_apply_when: The output is a list of improvements rather than findings.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the findings
  - the severity of each
artifact_contract_verified_by: every finding carries exactly one severity and the criteria of that level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify every review finding before it leaves the review
Critical
incorrect behavior, security vulnerability, or data loss risk; must be fixed before this code ships
Important
degrades quality, maintainability, or robustness; should be fixed
Minor
Style issues, naming improvements, dead code, unused imports, suggestions
Findings without a classification are not valid output.
