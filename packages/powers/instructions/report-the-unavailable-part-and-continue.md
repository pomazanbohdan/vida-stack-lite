---
instruction_id: report-the-unavailable-part-and-continue
title: Report the unavailable part and continue
summary: "What cannot be measured is reported as unavailable rather than as an error, and the report continues with the parts that are there."
capability_tags:
  - communicate-concisely
pattern_tags:
  - empty-result-policy
conditions_applies_when: A report is produced from sources that may be missing.
conditions_does_not_apply_when: Every source is present.
artifact_contract_output_type: partial-report
artifact_contract_required_data:
  - the unavailable part
  - the reason it is unavailable
  - the parts that were produced
artifact_contract_verified_by: the report names the unavailable part instead of failing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/milestone-summary.md
status: active
revision: 1
---

# Report the unavailable part and continue
Missing files are fine - the summary adapts to what's available.
Report "Git statistics unavailable - no tag or date range could be determined."
This is not an error - the summary continues without the Stats section.
Do not error on empty input.
