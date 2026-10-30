---
instruction_id: inject-a-cold-start-smoke-test-when-the-entry-paths-changed
title: Inject a cold-start smoke test when the entry paths changed
summary: "When the work touched a start-up, database, seed or container path, a test that starts everything from scratch is put at the front of the list."
capability_tags:
  - verify-work-results
pattern_tags:
  - failure-first-analysis
conditions_applies_when: The finished work changed how the application starts or seeds itself.
conditions_does_not_apply_when: "None of the start-up, storage or container paths were touched."
artifact_contract_output_type: smoke-test-checkpoint
artifact_contract_required_data:
  - the paths that were touched
  - the cold-start checkpoint
artifact_contract_verified_by: the cold-start checkpoint is present and first in the list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Inject a cold-start smoke test when the entry paths changed
After extracting tests from SUMMARYs, scan the SUMMARY files for modified/created file paths. If ANY path matches these patterns:
Then **prepend** this test to the test list:
This catches bugs that only manifest on fresh start — race conditions in startup sequences, silent seed failures, missing environment setup — which pass against warm state but break in production.
