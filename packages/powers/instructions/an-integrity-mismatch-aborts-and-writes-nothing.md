---
instruction_id: an-integrity-mismatch-aborts-and-writes-nothing
title: An integrity mismatch aborts and writes nothing
summary: "When the computed hash does not match the declared one the installation is aborted and nothing is written to disk, so a tampered download cannot land half-installed."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A download is checked against a declared integrity hash before it is installed.
conditions_does_not_apply_when: No integrity hash is declared for the source.
artifact_contract_output_type: integrity-result
artifact_contract_required_data:
  - the declared hash
  - the computed hash
  - what was written
artifact_contract_verified_by: the install aborted and nothing was written to disk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/import-a-capability-from-a-url.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An integrity mismatch aborts and writes nothing
aborts the install. Nothing is written to disk.
This protects against a tampered or corrupted download.
