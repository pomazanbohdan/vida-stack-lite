---
instruction_id: scope-the-platform-only-precondition-and-keep-the-behavioral-assertion
title: Scope the platform-only precondition and keep the behavioral assertion
summary: An assertion that only one platform can satisfy is put behind a platform check; the behavioral assertion that every platform can satisfy stays and runs everywhere.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "A test asserts something the platform does not support, and a behavioral assertion is available beside it."
conditions_does_not_apply_when: The assertion is valid on every platform.
artifact_contract_output_type: platform-scoped-assertion
artifact_contract_required_data:
  - the platform-only precondition
  - the behavioral assertion that stays
  - the platform check that scopes it
artifact_contract_verified_by: the platform-only assertion is scoped and the behavioral assertion still runs on every platform
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 1
---

# Scope the platform-only precondition and keep the behavioral assertion
- **Gate it behind a platform check and keep the real behavioral assertion running on every OS** (do not delete it — scope it)
- Prefer asserting the *behavior* (command shape, runnability) over the raw mode bit where you can.
