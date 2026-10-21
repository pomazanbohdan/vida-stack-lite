---
instruction_id: check-the-schema-version-before-you-read-any-other-field
title: Check the schema version before you read any other field
summary: The contract version is read first and an unknown version is a hard failure; a best-effort parse of an unknown shape is how an integration starts reporting wrong numbers.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A machine-readable document with a version field is about to be consumed.
conditions_does_not_apply_when: The document carries no version.
artifact_contract_output_type: version-check
artifact_contract_required_data:
  - the version found
  - the decision taken on it
artifact_contract_verified_by: the version was checked before any other field was read and an unknown version stopped the read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/consume-the-planning-snapshot.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/consume-the-state-contract.md
status: active
revision: 1
---

# Check the schema version before you read any other field
**Reject any version you were not written against.** Do this before you touch any other field
Best-effort-parsing an unknown shape is how an integration starts silently reporting wrong numbers after an upgrade. A hard failure is the kinder outcome.
`contract` is semver. Under `1.x` changes are additive only — new keys may appear, existing keys keep their meaning — so gate on the **major** version and tolerate unknown minors
