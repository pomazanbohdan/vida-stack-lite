---
instruction_id: assert-the-negotiated-version-in-the-consumers-test
title: "Assert the negotiated version in the consumer's test"
summary: "A consumer pins the version it targets and asserts on it in its own test, and treats an unknown value as additive instead of crashing."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A consumer of a published interface is being written or upgraded.
conditions_does_not_apply_when: The consumer never negotiates a version because the interface is not versioned.
artifact_contract_output_type: version-assertion
artifact_contract_required_data:
  - the pinned version
  - "the assertion in the consumer's test"
  - the treatment of an unknown value
artifact_contract_verified_by: "the consumer pins the version, asserts it, and ignores unknown values"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 1
---

# Assert the negotiated version in the consumer's test
- Pin to a `PROTOCOL_VERSION` and assert on it in your host-plugin's test.
- Treat unknown axis values / adapter options as additive (ignore, don't crash).
