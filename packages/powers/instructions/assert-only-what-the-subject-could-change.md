---
instruction_id: assert-only-what-the-subject-could-change
title: Assert only what the subject could change
summary: An assertion counts only when the subject could make it fail; an always-truthy left-hand side adds no coverage.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: An assertion is written or reviewed.
conditions_does_not_apply_when: "The check has no assertion, only a count or a threshold."
artifact_contract_output_type: assertion-review
artifact_contract_required_data:
  - the asserted value
  - the plausible defect that would make the assertion fail
artifact_contract_verified_by: a mutation of the subject could change the asserted value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assert only what the subject could change
Assertions must be capable of failing given a plausible defect in the SUT.
An assertion whose left-hand side is always truthy regardless of SUT behavior does not add coverage.
Non-compliant:
assert(true);
assert.ok(output !== undefined); // output is unconditionally set above
Compliant: Assert on a value that the SUT computed and that a mutation of the SUT could change.
No automated rule covers all shapes; code review is the primary gate.
