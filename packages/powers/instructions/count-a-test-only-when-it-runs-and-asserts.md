---
instruction_id: count-a-test-only-when-it-runs-and-asserts
title: Count a test only when it runs and asserts
summary: "A test counts as verification only when it runs normally and an assertion observes the changed output, branch or contract."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A candidate test is weighed against the changed behavior.
conditions_does_not_apply_when: No test was found for the behavior.
artifact_contract_output_type: test-weighting
artifact_contract_required_data:
  - the test
  - whether it runs
  - what its assertion observes
artifact_contract_verified_by: a test was counted only when it runs and asserts the changed behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 2
---

# Count a test only when it runs and asserts
A test counts only if it runs normally and an assertion observes the changed output, branch, or contract.
These do not count: no execution; source-text assertions that match a file's wording instead of running it; success/no-throw/snapshot-only checks; mock/log-call checks; human-only checks; tests that mock away the integration; e2e tests that pass through without checking the changed output; stale assertions or fixtures.
For example, `expect(x ?? DEFAULT).toBe(DEFAULT)` passes when `x` is missing.
A test that passes regardless of whether the feature it describes is implemented is worse than no test: it inflates the count while providing false confidence.
The test must be capable of failing if the feature is absent or broken.
Write the test first (red phase of TDD), confirm it fails with a stub implementation, then implement.
