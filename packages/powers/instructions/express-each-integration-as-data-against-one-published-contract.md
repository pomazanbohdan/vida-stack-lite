---
instruction_id: express-each-integration-as-data-against-one-published-contract
title: Express each integration as data against one published contract
summary: "An integration declares the points it binds and the values it supports; it does not reach into the engine's internals, and the generated output cannot drift from what the installer produces."
capability_tags:
  - design-structure
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A new integration with an engine is being described.
conditions_does_not_apply_when: The engine has no published contract to bind to.
artifact_contract_output_type: descriptor-contract
artifact_contract_required_data:
  - the declared points and values
  - the contract it is expressed against
  - the source of truth for the output
artifact_contract_verified_by: the integration is data against the published contract and the output has one source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 1
---

# Express each integration as data against one published contract
- A host does not reach into GSD's internals; it declares which interface points it binds and which values it supports for each negotiated axis, and the engine tells it, deterministically, what it gets.
- Runtime output can no longer drift from what the installer produces, because there is only one source of truth for it.
