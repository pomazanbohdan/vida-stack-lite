---
instruction_id: prove-regression-test-detects-bug
title: Prove the regression test catches the bug
summary: "Reproduce the bug with a test, confirm it fails without the fix and passes with it, and restore the fix before reporting."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: You add a test that must protect against the bug returning.
conditions_does_not_apply_when: The test checks new behavior with no prior failure.
artifact_contract_output_type: regression-proof
artifact_contract_required_data:
  - test
  - run with the fix
  - run without the fix
  - restoration
artifact_contract_verified_by: the reverse run fails without the fix and passes with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/verification-before-completion/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove the regression test catches the bug
Write a failing test that reproduces the bug.
Follow the TDD cycle.
The test proves the fix and prevents regression.
Never fix bugs without a test.
Regression test: write, run, and confirm it passes.
Revert the fix.
Run the test; it must fail.
Restore the fix.
Run the test; it must pass.
"I've written a regression test" without red-green verification is not proof.
A test that passes once proves nothing.
Manual testing is ad-hoc: no record of what you covered, no way to re-run it when the code changes.
Automated tests run the same way every time.
Report the actual state of each run.
