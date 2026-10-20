---
instruction_id: mutate-the-change-to-test-the-test
title: Prove the test by mutating the change
summary: "Invert one condition the change adds, run the suite, and name the missing test case when it stays green."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A review must judge whether the tests of a change would catch a regression.
conditions_does_not_apply_when: The change carries no test that could be mutated.
artifact_contract_output_type: mutation-check
artifact_contract_required_data:
  - the mutated condition
  - the suite result
  - the missing test case named
artifact_contract_verified_by: the suite was run with the mutation and the file was restored afterwards
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 1
---

# Prove the test by mutating the change

Would the tests catch a regression if the code changed?

Answer the last question by experiment, not by reading. Invert one condition the change adds (drop a negation, swap `&&` for `||`), run the suite, then restore the file from a copy. A mutation that stays green is a finding: name the test case that is missing.

- Do tests exist for the change?
- Do they test behavior (not implementation details)?
- Are edge cases covered?
- Do tests have descriptive names?
