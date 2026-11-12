---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-build-test-completed-work-md-c381fe2e-c01"
title: "bmad-method: docs/build/test-completed-work.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/build/test-completed-work.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/build/test-completed-work.md\"}"
atom_ids:
  - confirm-the-scenarios-before-you-write-the-tests
  - keep-the-generated-coverage-simple-and-in-scope
  - never-edit-the-expectation-to-match-the-code
atom_count: 3
atoms: "[{\"atom_id\":\"confirm-the-scenarios-before-you-write-the-tests\",\"file_sha256\":\"087599e42de0fa287d428541bee5f72b8f8a1271aff9a1dc8d9bf6617fc4d195\",\"content_sha256\":\"409f1ab7feeb416943bbb76c29dbcf786937dcb6149499893a44980e8c48b94e\",\"file_bytes\":1599,\"body_bytes\":473},{\"atom_id\":\"keep-the-generated-coverage-simple-and-in-scope\",\"file_sha256\":\"6195b7b2fb6f996ce010f7ad8a7b5974fe7317a3ab91c7801592616c5b3011bf\",\"content_sha256\":\"03ed0f44affb997d5198c26098523b9f2c39a4d79966c8c0a81df506c58ef10f\",\"file_bytes\":1497,\"body_bytes\":378},{\"atom_id\":\"never-edit-the-expectation-to-match-the-code\",\"file_sha256\":\"3a0be915018f0216d28f597cc728c5606da4867d1430d01607d2b859720da492\",\"content_sha256\":\"5eec20a82835b0c1da4b601e67aeb9cb9e6aea19bebe67442dffcf8a3a7ac0a0\",\"file_bytes\":2307,\"body_bytes\":901}]"
carrier_sha256: 31475c31034de09af8312a884147306ff3c38e74990cc1e24dc932b145bfcbd1
carrier_bytes: 5854
revision: 1
status: active
---
<!-- vpmodule:atom:begin confirm-the-scenarios-before-you-write-the-tests -->
---
instruction_id: confirm-the-scenarios-before-you-write-the-tests
title: Confirm the scenarios before you write the tests
summary: "Decide what to test from the request, the ticket or the branch, list the scenarios one sentence each, and wait for the confirmation."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: Automated coverage is being written for work that already exists.
conditions_does_not_apply_when: The behaviour does not exist yet and the tests are written first.
artifact_contract_output_type: scenario-list
artifact_contract_required_data:
  - the target of the tests
  - the scenarios
  - the confirmation
artifact_contract_verified_by: the scenarios are one sentence each and were confirmed before the tests were written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/test-completed-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Confirm the scenarios before you write the tests
Decide what to test — from what you asked for, or a ticket that is in review, or what the current branch changed.
It asks if none of those says.
List the scenarios — one sentence each, and waits for your confirmation.
Learn how the project already tests — and runs those tests once first.
Write one test per scenario — driving the app the way a user or an API client would, with each test setting up its own data.
<!-- vpmodule:atom:end confirm-the-scenarios-before-you-write-the-tests -->
<!-- vpmodule:atom:begin keep-the-generated-coverage-simple-and-in-scope -->
---
instruction_id: keep-the-generated-coverage-simple-and-in-scope
title: Keep the generated coverage simple and in scope
summary: "Cover the main path and the errors a user can see, with the framework's own features, and leave the rest as follow-up work."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: Coverage is generated for work that is already implemented.
conditions_does_not_apply_when: The behaviour does not exist yet and the tests are written first.
artifact_contract_output_type: coverage-scope
artifact_contract_required_data:
  - what is covered
  - what is left out
  - the reason
artifact_contract_verified_by: "the tests use the framework's own features and the scope stays on the main path and the visible errors"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/test-completed-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the generated coverage simple and in scope
This is generated coverage of finished work.
Generated tests stay simple on purpose: the framework's standard features, the project's existing helpers, and tests that pass in any order.
It covers the main path and the errors a user can see, and no more.
It does not build shared test helpers.
More edge cases are follow-up work
<!-- vpmodule:atom:end keep-the-generated-coverage-simple-and-in-scope -->
<!-- vpmodule:atom:begin never-edit-the-expectation-to-match-the-code -->
---
instruction_id: never-edit-the-expectation-to-match-the-code
title: Never edit the expectation to match the code
summary: "When a test and the agreed behaviour disagree, the code changes; the expectation is never rewritten to match what the code does."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test disagrees with the behaviour the plan agreed on.
conditions_does_not_apply_when: The behaviour itself was ambiguous and the row had to be settled.
artifact_contract_output_type: expectation-decision
artifact_contract_required_data:
  - the disagreement
  - what was changed
  - the ambiguity when there is one
artifact_contract_verified_by: "the code was brought to the expectation, not the expectation to the code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/test-completed-work.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never edit the expectation to match the code
If a test disagrees with the matrix, never edit the expectation to match the code: fix the code, or if the matrix row itself is ambiguous, HALT with status `blocked` and blocking condition `matrix ambiguity`.
If the audit cannot otherwise be satisfied, HALT with status `blocked` and blocking condition `matrix test audit failed`.
Run the new tests twice. A real bug is reported, and its test is kept as a known failure.
No test is loosened to make it pass.
- **Fix: normalize the ACTUAL operand to POSIX before comparing** — this is idempotent on POSIX (a no-op when there are no backslashes) and *reveals* a malformed return rather than masking it:
- Do **not** instead wrap the *expected* literal in `path.join(...)` to match the platform separator — that passes everywhere but masks a wrong backslash-on-POSIX return (both sides wrong together).
<!-- vpmodule:atom:end never-edit-the-expectation-to-match-the-code -->