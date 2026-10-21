---
instruction_id: register-a-test-that-reads-shipped-content-so-it-runs-on-the-change
title: Register a test that reads shipped content so it runs on the change
summary: "A test that reads shipped prose and asserts on it is registered against the paths it reads, so it runs on the change that breaks it instead of failing later on a shared branch."
capability_tags:
  - build-verification-harness
pattern_tags:
  - test-placement-strategy
conditions_applies_when: A test reads shipped content and asserts on what it says.
conditions_does_not_apply_when: The test only checks that a file exists and never reads its content.
artifact_contract_output_type: guard-registration
artifact_contract_required_data:
  - the paths the test reads
  - the registration entry
  - whether the test asserts on content
artifact_contract_verified_by: the test is registered against the paths it reads and runs on the change that edits them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/docs-guard-registration.md
status: active
revision: 1
---

# Register a test that reads shipped content so it runs on the change
- A test that reads shipped `docs/` content and asserts on it must be registered so it actually runs on the PR that changes those docs — otherwise it can only fail *after* merge, on the shared branch.
- Register the test when it asserts on the **content** of shipped prose — the test would need to change (or would break) if the doc's wording, structure, or specific values changed.
- Exempt the test when it touches `docs/` only incidentally: overlay/fixture input, a path predicate, an existence check with no content assertion, or a scan-exclusion list.
