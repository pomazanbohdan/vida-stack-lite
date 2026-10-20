---
instruction_id: do-not-report-what-the-gap-analysis-must-not-report
title: Do not report what the gap analysis must not report
summary: "A gap is not reported for a compiler-enforced case, for behavior an integration test already covers, for a mock-only test, for low coverage alone, or for legacy code the change never touched."
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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 1
---

# Do not report what the gap analysis must not report
Do not report: compiler/type-checker-enforced cases; behavior already verified by an integration, contract, or e2e test; implementation-detail or mock-only tests; low coverage or a missing test file by itself; legacy untested code the change did not affect.
