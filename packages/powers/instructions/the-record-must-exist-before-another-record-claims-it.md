---
instruction_id: the-record-must-exist-before-another-record-claims-it
title: The record must exist before another record claims it
summary: "The report is written and committed before the ledger says anything about it, so the ledger never claims something the report does not show."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: One record will state something about another record.
conditions_does_not_apply_when: The records are independent.
artifact_contract_output_type: record-ordering
artifact_contract_required_data:
  - the report that exists first
  - the ledger that claims after it
artifact_contract_verified_by: the report was on disk and committed before the ledger claimed anything about it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review-fix.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review/steps/dispatch-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# The record must exist before another record claims it
The fix report must be on disk and committed before the ledger claims anything about it
This step runs AFTER `commit_review` so a freshly-written REVIEW.md is guaranteed to be on disk before the fixer is invoked.
