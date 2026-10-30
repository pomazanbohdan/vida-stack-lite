---
instruction_id: make-the-decision-explicit-now-rather-than-deferring-it-to-runtime
title: Make the decision explicit now rather than deferring it to runtime
summary: "An ambiguous requirement gets a forcing function that settles it at build time, or it is recorded as an open decision."
capability_tags:
  - execute-plan
pattern_tags:
  - technical-debt
conditions_applies_when: An ambiguous requirement or an unclear integration point is met while implementing.
conditions_does_not_apply_when: The requirement is unambiguous.
artifact_contract_output_type: forced-decision
artifact_contract_required_data:
  - the decision
  - the mechanism that forces it
  - the recorded deviation when it cannot be forced
artifact_contract_verified_by: the decision is explicit at build time or recorded as an open decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the decision explicit now rather than deferring it to runtime
When you encounter an ambiguous requirement or unclear integration point, create a forcing function that makes the decision explicit NOW rather than hiding it behind a TODO or runtime check. Examples: use a TypeScript `never` type to force exhaustive switches, add a build-time assertion for required config values, create an interface that forces callers to handle error cases. If a decision truly cannot be made at build time, document it as a `checkpoint:decision` deviation -- do not silently defer.
