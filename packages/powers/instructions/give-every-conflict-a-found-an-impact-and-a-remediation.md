---
instruction_id: give-every-conflict-a-found-an-impact-and-a-remediation
title: "Give every conflict a found, an impact and a remediation"
summary: "Each conflict entry states what was found, what it means and what to do about it, and the report is plain text, not a table."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A conflict report is rendered for the user.
conditions_does_not_apply_when: The report is consumed by a machine that expects structured output.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the found statement
  - the expected or the impact
  - the remediation line
artifact_contract_verified_by: "every entry has a found, one of expected/impact/note and a remediation where the severity requires it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/doc-conflict-engine.md
status: active
revision: 1
---

# Give every conflict a found, an impact and a remediation
Every entry requires `Found:` plus one of `Expected:`/`Impact:`/`Note:`
plus (for Critical/Important) a `→` remediation line.
Plain-text, never markdown tables (no `|---|`). The report is rendered to the user verbatim.
