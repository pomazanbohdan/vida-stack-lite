---
instruction_id: escalate-an-implementation-bug-instead-of-weakening-the-assertion
title: Escalate an implementation bug instead of weakening the assertion
summary: The implementation is not touched; a test that shows the code violates the requirement is escalated.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A newly written test fails because the implementation is wrong.
conditions_does_not_apply_when: The test itself is wrong.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the failing test
  - the escalated requirement
artifact_contract_verified_by: the implementation was not modified and the gap was escalated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 1
---

# Escalate an implementation bug instead of weakening the assertion
Implementation files are READ-ONLY. Only create/modify: test files, fixtures, VALIDATION.md. Implementation bugs → ESCALATE. Never fix implementation.
IMPLEMENTATION BUG → ESCALATE
Debugging a failing test by weakening the assertion rather than fixing the implementation via ESCALATE
