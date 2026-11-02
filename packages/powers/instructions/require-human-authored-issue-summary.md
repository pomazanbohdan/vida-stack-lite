---
instruction_id: require-human-authored-issue-summary
title: Require a human-authored issue summary
summary: "Before filing an issue or public comment, require a human-authored summary in the owner's own words and a named filer; a placeholder means the report is not ready."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An issue or public comment is about to be filed.
conditions_does_not_apply_when: Nothing is being filed or shared outside its origin.
artifact_contract_output_type: issue-report
artifact_contract_required_data:
  - who is filing and for whom
  - the owner's own summary
  - confirmation that the summary is not a placeholder
artifact_contract_verified_by: the owner's words are present and no placeholder remains
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/templates/issue.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Require a human-authored issue summary
Before filing an issue or comment, get the owner's own words on what went wrong and what should have happened.
Paste them as written; if they run long, ask them to trim rather than editing their words.
Record who is filing and on whose behalf, with the request that led to the diagnosis or issue.
A placeholder summary means the report is not ready to file.
Do not file an issue or comment with a placeholder summary, and do not substitute your own summary for theirs.
