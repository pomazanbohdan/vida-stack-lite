---
instruction_id: do-not-report-what-the-gap-analysis-must-not-report
title: Do not report what the gap analysis must not report
summary: "A gap is not reported for a compiler-enforced case, for behavior an integration test already covers, for low coverage alone, or for untested code the change never touched; a mock-only test does not count as coverage."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A candidate gap is being written out and the exclusions are checked.
conditions_does_not_apply_when: The candidate is a genuine gap that none of the exclusions covers.
artifact_contract_output_type: gap-exclusions
artifact_contract_required_data:
  - the excluded candidates
  - the reason each was excluded
artifact_contract_verified_by: no reported gap falls under one of the excluded kinds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Do not report what the gap analysis must not report
Do not report: cases the compiler or type checker enforces; behavior an integration, contract, or end-to-end test already verifies; low coverage or a missing test file by itself; untested code the change did not touch.
A mock-only or log-call test does not count as verification, so a real regression behind one is a gap rather than a reason to stay silent.
