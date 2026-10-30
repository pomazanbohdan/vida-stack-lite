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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/test-completed-work.md
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
