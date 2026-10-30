---
instruction_id: a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one
title: "A skipped gap is an unverified requirement, not a resolved one"
summary: A gap counts as filled only when a test actually ran and passed.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The coverage of a requirement is decided.
conditions_does_not_apply_when: The test ran and passed.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the gap
  - its status
artifact_contract_verified_by: no gap is reported as filled without a test that ran and passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# A skipped gap is an unverified requirement, not a resolved one
Marking gaps as SKIP without escalating — a skipped gap is an unverified requirement, not a resolved one
Run every test. Never mark untested tests as passing.
Treating "test file created" as "gap filled" before the test actually runs and passes
