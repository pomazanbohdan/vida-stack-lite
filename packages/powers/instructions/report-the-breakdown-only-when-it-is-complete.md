---
instruction_id: report-the-breakdown-only-when-it-is-complete
title: Report the breakdown only when it is complete
summary: A breakdown of counts is printed only when every count is a number and they add up.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report carries counts of findings by severity.
conditions_does_not_apply_when: The report carries a single verdict and no counts.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the counts by severity
artifact_contract_verified_by: the breakdown was printed only when every count was a number and they added up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 1
---

# Report the breakdown only when it is complete
The breakdown is reportable only when ALL FOUR counts are numbers.
A count that is empty
non-numeric, over-long or inconsistent
makes the whole breakdown unavailable
rather than half-filled. Half-true is worse than withheld.
inconsistent breakdown is unavailable for the same reason a partial one is: half-true is worse
than withheld, and the countless form is already the documented fallback.
