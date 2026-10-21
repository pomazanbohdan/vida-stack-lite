---
instruction_id: declare-the-consumer-of-an-artifact
title: Declare the consumer of an artifact
summary: "An artifact that nothing reads is inert; its meaning comes from the consumer that reads it, so the consumer is named."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verified-loading
conditions_applies_when: An artifact is written that later work depends on.
conditions_does_not_apply_when: The artifact is a temporary file of this session.
artifact_contract_output_type: artifact-consumer
artifact_contract_required_data:
  - the artifact
  - the consumer that reads it
  - the point at which it is loaded
artifact_contract_verified_by: "a named consumer loads the artifact, and the artifact says what it is for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/artifact-types.md
status: active
revision: 1
---

# Declare the consumer of an artifact
A well-formatted artifact that no workflow reads is inert — the consumption mechanism is what gives an artifact meaning.
The lenses only take effect when an agent loads them into its reasoning context before analysis.
Why consumption matters:
