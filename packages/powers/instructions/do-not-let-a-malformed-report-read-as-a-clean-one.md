---
instruction_id: do-not-let-a-malformed-report-read-as-a-clean-one
title: Do not let a malformed report read as a clean one
summary: A report that cannot be parsed is announced as such and never shown as a clean one.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report that should carry findings cannot be read as it should be.
conditions_does_not_apply_when: The report was read and parsed.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the state of the report
  - what could not be trusted
artifact_contract_verified_by: an unparseable report was announced as unparseable and not silently shown as clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not let a malformed report read as a clean one
NO STATUS is not NO REVIEW.
A review that reports findings NONE of which this parser understood is also something to record, and it is the case with the least evidence anywhere else.
Partial shortfalls (some findings parsed, some not) always reported, which is exactly why the total one read as covered.
the result is a zero-row ledger carrying an unparsed key -- an honest record that the review declared findings and none of them were understood, which is strictly better than the file not existing.
Surfaced, not thrown: the gate is advisory.
